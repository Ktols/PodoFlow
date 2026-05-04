import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las variables de entorno de Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper para generar números aleatorios
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generar una hora aleatoria entre 09:00 y 18:00
const randomTime = () => {
  const h = randomInt(9, 17);
  const m = Math.random() > 0.5 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
};

async function generateData() {
  const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];
  const numCitas = parseInt(process.argv[3] || '5', 10);
  
  console.log(`🚀 Generando ${numCitas} citas atendidas para el día: ${targetDate}`);

  // 1. Obtener datos de referencia
  const { data: sucursales } = await supabase.from('sucursales').select('id').limit(1);
  if (!sucursales?.length) throw new Error('No hay sucursales');
  const sucursal_id = sucursales[0].id;

  const { data: podologos } = await supabase.from('podologos').select('id').limit(2);
  if (!podologos?.length) throw new Error('No hay podólogos');

  const { data: pacientes } = await supabase.from('pacientes').select('id').limit(5);
  if (!pacientes?.length) throw new Error('No hay pacientes. Crea al menos uno en la app.');

  const { data: servicios } = await supabase.from('servicios').select('nombre, precio_base').limit(3);
  const { data: productos } = await supabase.from('productos').select('nombre').limit(2);

  // 2. Crear citas
  for (let i = 0; i < numCitas; i++) {
    const paciente = pacientes[randomInt(0, pacientes.length - 1)];
    const podologo = podologos[randomInt(0, podologos.length - 1)];
    
    // Insertar Cita
    const { data: cita, error: citaError } = await supabase.from('citas').insert([{
      paciente_id: paciente.id,
      podologo_id: podologo.id,
      sucursal_id: sucursal_id,
      fecha_cita: targetDate,
      hora_cita: randomTime(),
      motivo: 'Atención Podológica Generada (Prueba)',
      estado: 'Atendida'
    }]).select().single();

    if (citaError) {
      console.error('❌ Error creando cita:', citaError);
      continue;
    }

    // Seleccionar 1 o 2 servicios aleatorios para el historial clínico
    const serviciosUsados = [];
    if (servicios?.length) {
      serviciosUsados.push(servicios[randomInt(0, servicios.length - 1)].nombre);
      if (Math.random() > 0.5 && servicios.length > 1) {
        serviciosUsados.push(servicios[randomInt(0, servicios.length - 1)].nombre);
      }
    }

    // Ocasionalmente recetar productos
    const recetados = [];
    if (productos?.length && Math.random() > 0.4) {
      recetados.push(productos[randomInt(0, productos.length - 1)].nombre);
    }

    // Insertar Atención Clínica
    const { error: atencionError } = await supabase.from('atenciones').insert([{
      cita_id: cita.id,
      paciente_id: paciente.id,
      podologo_id: podologo.id,
      motivo_consulta: 'Paciente requiere atención de rutina (Generado).',
      tratamiento: 'Se realizó perfilado y limpieza (Generado).',
      indicaciones: 'Cuidar higiene diaria.',
      tratamientos_realizados: serviciosUsados,
      medicamentos_recetados: recetados
    }]);

    if (atencionError) {
      console.error('❌ Error creando atención:', atencionError);
    } else {
      console.log(`✅ Cita ${cita.id.split('-')[0]} generada -> Pendiente de Cobro`);
    }
  }

  console.log('\n🎉 ¡Proceso terminado!');
  console.log('Ahora puedes ir a "Cobros Pendientes" en la app para registrarles el pago y probar la impresión de tickets y reportes.');
}

generateData().catch(console.error);
