import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBranchStore } from '../../../stores/branchStore';
import type { CitaParaCobro, Pack, PackCredito } from '../../../types/entities';

export interface ServicioActivo {
  id: string;
  nombre: string;
  precio_base: number;
}

export interface ProductoRecetado {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
}

export function useCobroInit(isOpen: boolean, cita: CitaParaCobro | null) {
  const { sucursalActiva } = useBranchStore();

  const [servicios, setServicios] = useState<ServicioActivo[]>([]);
  const [selectedServicios, setSelectedServicios] = useState<Set<string>>(new Set());
  const [heredadoDeMedico, setHeredadoDeMedico] = useState(false);
  const [pacienteSellos, setPacienteSellos] = useState(0);
  const [pacienteSellosCanjeados, setPacienteSellosCanjeados] = useState(0);
  const [productosRecetados, setProductosRecetados] = useState<ProductoRecetado[]>([]);
  const [packsDisponibles, setPacksDisponibles] = useState<Pack[]>([]);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [creditoActivo, setCreditoActivo] = useState<PackCredito | null>(null);

  // Contador de aperturas: se incrementa cada vez que isOpen pasa a true.
  // Esto fuerza al useEffect a re-ejecutarse incluso si cita es el mismo objeto.
  const openCounterRef = useRef(0);
  const [openCounter, setOpenCounter] = useState(0);

  useEffect(() => {
    if (isOpen) {
      openCounterRef.current += 1;
      setOpenCounter(openCounterRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !cita || openCounter === 0) return;

    // === HARD RESET de todo el estado del formulario ===
    setSelectedServicios(new Set());
    setHeredadoDeMedico(false);
    setPacienteSellos(0);
    setPacienteSellosCanjeados(0);
    setProductosRecetados([]);
    setPacksDisponibles([]);
    setSelectedPack(null);
    setCreditoActivo(null);

    const initDrawer = async () => {
      // 0. Fetch sellos del paciente
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('sellos, sellos_canjeados')
        .eq('id', cita.paciente_id)
        .single();
      if (pacienteData) {
        setPacienteSellos(pacienteData.sellos || 0);
        setPacienteSellosCanjeados(pacienteData.sellos_canjeados || 0);
      }

      // 1. Fetch FRESCO de servicios activos (sin cache)
      const { data: serviciosData } = await supabase
        .from('servicios')
        .select('id, nombre, precio_base')
        .eq('estado', true)
        .eq('sucursal_id', sucursalActiva?.id)
        .order('nombre');

      const svcs = serviciosData || [];
      setServicios(svcs);

      // 2. Fetch FRESCO de la atencion vinculada a esta cita
      const { data: atencionData } = await supabase
        .from('atenciones')
        .select('tratamientos_realizados, medicamentos_recetados')
        .eq('cita_id', cita.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3. Inyeccion de servicios heredados
      if (atencionData?.tratamientos_realizados && Array.isArray(atencionData.tratamientos_realizados)) {
        const nombresHeredados: string[] = atencionData.tratamientos_realizados;
        const idsPreseleccionados = new Set<string>();
        for (const srv of svcs) {
          if (nombresHeredados.includes(srv.nombre)) {
            idsPreseleccionados.add(srv.id);
          }
        }
        if (idsPreseleccionados.size > 0) {
          setSelectedServicios(idsPreseleccionados);
          setHeredadoDeMedico(true);
        }
      }

      // 4. Resolver medicamentos recetados a productos con precio y stock
      if (atencionData?.medicamentos_recetados && Array.isArray(atencionData.medicamentos_recetados) && atencionData.medicamentos_recetados.length > 0) {
        const { data: prodsData } = await supabase
          .from('productos')
          .select('id, nombre, precio, stock')
          .in('nombre', atencionData.medicamentos_recetados)
          .eq('estado', true);

        if (prodsData && prodsData.length > 0) {
          setProductosRecetados(prodsData);
        }
      }

      // 5. Fetch packs/promos activos para la sucursal
      const today = new Date().toISOString().split('T')[0];
      const { data: packsData } = await supabase
        .from('packs_promociones')
        .select(`*, pack_items (id, servicio_id, producto_id, cantidad, servicios:servicio_id (id, nombre, precio_base), productos:producto_id (id, nombre, precio))`)
        .eq('sucursal_id', sucursalActiva?.id)
        .eq('estado', true);

      if (packsData) {
        // Filtrar promos vencidas, agotadas e inactivas
        const activos = (packsData as Pack[]).filter(p => {
          if (!p.estado) return false;
          if (p.fecha_fin && p.fecha_fin < today) return false;
          if (p.stock_total && (p.stock_usado || 0) >= p.stock_total) return false;
          return true;
        });
        setPacksDisponibles(activos);

        // Pre-seleccionar pack si la cita tiene uno asignado
        const citaPackId = cita.pack_id;
        if (citaPackId) {
          const packCita = activos.find(p => p.id === citaPackId);
          if (packCita) {
            setSelectedPack(packCita);
          } else {
            // Pack fue desactivado/agotado pero la cita ya lo tiene asignado - buscar directamente
            const packFromAll = (packsData as Pack[]).find(p => p.id === citaPackId);
            if (packFromAll) {
              setSelectedPack(packFromAll);
              setPacksDisponibles(prev => [...prev, packFromAll]);
            }
          }
        }
      }

      // 6. Buscar credito del pack para esta cita
      let foundCredito: PackCredito | null = null;

      // Primero: si esta cita ya consumio sesion (via AtencionDrawer), buscar ese credito
      if (cita.pack_id) {
        const { data: sesionLog } = await supabase
          .from('pack_sesiones_log')
          .select('credito_id')
          .eq('cita_id', cita.id)
          .maybeSingle();

        if (sesionLog) {
          const { data: creditoUsado } = await supabase
            .from('pack_creditos')
            .select('*')
            .eq('id', sesionLog.credito_id)
            .single();
          if (creditoUsado) foundCredito = creditoUsado as PackCredito;
        }
      }

      // Segundo: si no se encontro por log, buscar creditos activos
      if (!foundCredito) {
        const { data: creditosData } = await supabase
          .from('pack_creditos')
          .select('*')
          .eq('paciente_id', cita.paciente_id)
          .eq('estado', 'activo')
          .eq('sucursal_id', sucursalActiva?.id);

        if (creditosData && creditosData.length > 0) {
          const citaPackId = cita.pack_id;
          foundCredito = (creditosData.find((c: PackCredito) => {
            if (c.sesiones_usadas >= c.sesiones_total) return false;
            if (citaPackId) return c.pack_id === citaPackId;
            return true;
          }) as PackCredito) || null;
        }
      }

      if (foundCredito) setCreditoActivo(foundCredito);
    };

    initDrawer();
  }, [openCounter]); // Solo depende del contador de aperturas

  return {
    servicios,
    selectedServicios,
    setSelectedServicios,
    heredadoDeMedico,
    pacienteSellos,
    setPacienteSellos,
    pacienteSellosCanjeados,
    setPacienteSellosCanjeados,
    productosRecetados,
    packsDisponibles,
    selectedPack,
    setSelectedPack,
    creditoActivo,
    setCreditoActivo,
    openCounter,
  };
}
