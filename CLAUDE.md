# PodoFlow - Guia del Proyecto

SaaS de gestion clinica podologica multi-sucursal. Nombre comercial: "G&C Podologia".

## Stack

- React 19 + TypeScript 5.9 (strict) + Vite 5.4
- Tailwind CSS 3.4 (primary: #00C288, secondary: #004975)
- Supabase PostgreSQL (RLS habilitado)
- Clerk (autenticacion, localizacion esES)
- Zustand (estado global), React Hook Form + Zod (formularios)
- Recharts (graficas), Lucide (iconos), React Hot Toast (notificaciones)

## Comandos

```bash
npm run dev       # Servidor de desarrollo (Vite)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
```

## Variables de Entorno

```
VITE_CLERK_PUBLISHABLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Path Alias

`@/*` → `src/*` (configurado en tsconfig.app.json y vite.config.ts)

## Estructura de Archivos

```
src/
├── App.tsx                    # Rutas
├── main.tsx                   # Clerk provider + entry
├── components/
│   ├── auth/AuthGuard.tsx     # Wrapper de autorizacion
│   ├── layout/                # MainLayout, Sidebar, Header
│   ├── DatePicker.tsx         # Selector de fecha custom (reemplaza input[type=date])
│   └── ExportModal.tsx        # Modal generico de exportacion CSV
├── pages/                     # Organizadas por feature
│   ├── agenda/                # AgendaPage + CitaDrawer + CitasListPanel
│   ├── pacientes/             # PacientesPage + HistoriaClinicaPage
│   ├── especialistas/         # EspecialistasPage
│   ├── caja/                  # CajaPage (tabs: Cobros, Ventas, Productos, Servicios)
│   └── configuracion/         # TiendaPage, UsuariosPage
├── stores/                    # authStore (perfil+rol), branchStore (sucursal activa)
├── types/                     # entities.ts (interfaces), agenda.ts (Zod enums)
├── constants/                 # METODOS_PAGO, CATEGORIAS_PRODUCTO, TIME_OPTIONS, etc.
├── config/clinicData.ts       # Info clinica + SELLOS_PARA_GRATIS
└── lib/                       # supabase.ts (client), exportCsv.ts
```

## Rutas y Roles (RBAC)

| Ruta | Componente | dueno | administrativo | podologo |
|------|-----------|:-----:|:--------------:|:--------:|
| `/` | Dashboard | x | x | |
| `/agenda` | AgendaPage | x | x | x |
| `/pacientes` | PacientesPage | x | x | x |
| `/pacientes/:id/historia` | HistoriaClinicaPage | x | x | x |
| `/especialistas` | EspecialistasPage | x | x | |
| `/caja` | CajaPage | x | x | |
| `/servicios` | ServiciosPage | x | x | |
| `/inventario` | InventarioPage | x | x | |
| `/tienda` | TiendaPage | x | x | |
| `/usuarios` | UsuariosPage | x | | |

## Flujo de Autenticacion

1. Clerk autentica al usuario (OAuth/email)
2. `AuthGuard` llama `fetchPerfil(clerkUserId, email)`
3. Busca en `perfiles` por Clerk ID, fallback por email (usuarios pre-registrados)
4. Join con `roles` para obtener `rol_nombre`
5. Si no autorizado → pantalla "Acceso Restringido"

## Tablas de Base de Datos (Supabase)

- `roles` — dueno, administrativo, podologo
- `sucursales` — Sedes (nombre_comercial, ruc, direccion, telefono, whatsapp)
- `perfiles` — Usuarios (Clerk ID como PK, role_id FK)
- `usuarios_sucursales` — Asignacion usuario-sucursal (junction table)
- `pacientes` — Datos clinicos + sellos de fidelidad
- `citas` — Turnos (fecha_cita, hora_cita, estado, adelanto)
- `atenciones` — Notas clinicas (tratamientos_realizados[], productos_usados[], medicamentos_recetados[], fotos[])
- `pagos` — Cobros (monto_total, metodo_pago, visita_gratis)
- `servicios` — Catalogo de servicios con precio_base
- `productos` — Inventario (codigo, precio, stock, stock_minimo)
- `ventas` — Ventas de productos (items JSON, descuento, metodo_pago)

## Estados de Cita (Zod Enum - unica fuente de verdad)

Definidos en `src/types/agenda.ts` como `EstadoCitaSchema`:

Programada → Confirmada → En Sala de Espera → Atendida
                                             → Cancelada
                                             → No Asistio

**Estados finales** (no editables): Atendida, Cancelada, No Asistio

## Reglas Criticas de Desarrollo

1. **Multi-tenant:** TODAS las queries a Supabase DEBEN filtrar por `sucursal_id` usando `useBranchStore().sucursalActiva.id`. Nunca hacer queries globales sin filtro de sucursal.
2. **Mobile-first:** Clases base son para mobile, usar `sm:`, `md:`, `lg:` para pantallas mas grandes. Ejemplo: `className="flex flex-col md:flex-row p-4 md:p-6"`
3. **No inline styles:** Usar Tailwind CSS exclusivamente. No usar `style={{}}`.
4. **TypeScript strict:** Tipar respuestas de Supabase y props de componentes. No dejar imports ni variables sin usar.
5. **Fechas:** Usar `date-fns` con locale `es` para todo formateo de fechas.
6. **Notificaciones:** Usar `react-hot-toast` (toast.success/toast.error) para feedback al usuario. Nunca solo console.error sin toast.
7. **Build antes de commit:** Siempre verificar `npm run build` antes de hacer commit.
8. **Iconos:** Usar `lucide-react` exclusivamente.

## Patrones y Convenciones

### Nombrado
- Paginas: `*Page.tsx` (PacientesPage, AgendaPage)
- Formularios drawer: `*Drawer.tsx` (CitaDrawer, CobroDrawer)
- Schemas Zod: `*Schema.ts` en carpeta `schemas/` por feature
- Stores: `*Store.ts` con acciones `fetch*`, `set*`, `reset`
- Campos DB: snake_case, FKs como `{tabla}_id`

### Queries Supabase
- Siempre destructurar `{ data, error }` y validar ambos
- Joins: `select('*, roles ( nombre )')` para relaciones
- Usar `.single()` cuando se espera un solo resultado
- `.maybeSingle()` cuando puede no existir

### Drawers (paneles laterales)
- Wrapper: `fixed inset-0 z-[9999] !m-0` (el !m-0 anula space-y del padre)
- Panel: `absolute right-0 inset-y-0` (ocupa todo el alto del viewport)
- Estructura: Header fijo + Body scrolleable (`flex-1 overflow-y-auto`) + Footer fijo
- Footer padding responsive: `p-4 md:p-6`
- Botones: `text-sm` sin min-width fijo para mobile

### Formularios
- React Hook Form + Zod resolver
- `useWatch` preferido sobre `watch()` para renders aislados
- Inputs de fecha: usar componente `DatePicker` (no input[type=date] nativo)

### Sucursales (multi-branch)
- Dueno ve todas las sucursales activas
- Otros roles ven solo las asignadas via `usuarios_sucursales`
- Sucursal activa en `branchStore`, filtra queries con `sucursal_id`

### Fidelidad (Stamp Card)
- `SELLOS_PARA_GRATIS = 6` (6 visitas pagadas = 1 gratis)
- Sellos en `pacientes.sellos`, canjeados en `pacientes.sellos_canjeados`
- Al canjear: sellos → 0, sellos_canjeados += 1

## Git Workflow

- `main` — Produccion
- `QA` — Staging (deploy automatico a Vercel)
- `develop` — Integracion de desarrollo
- Feature branches: `feature/*`, `fix/*`

## CI/CD (.github/workflows/deploy-qa.yml)

- Trigger: push a QA o PR a QA
- Node 20 + npm install (sin package-lock para compatibilidad cross-platform)
- Build check: `tsc -b && vite build`
- Deploy: Vercel CLI con preview URL comentado en PR

## Verificacion Web con Playwright MCP

Al analizar la app web, verificar siempre:

1. **Responsive:** Mobile (375px), Tablet (768px), Desktop (1440px)
2. **Consola:** Cero errores JS, 404s, o warnings criticos
3. **UI:** Sin solapamientos, elementos clicables, drawers abren/cierran correctamente

Flujo: Navegar → Screenshot desktop → Revisar consola → Resize tablet → Resize mobile → Reportar
