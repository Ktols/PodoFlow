# 🦶 PodoFlow — Clinical Management System

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PodoFlow** es una plataforma SaaS de gestión clínica integral diseñada específicamente para centros podológicos. Optimiza el flujo operativo diario desde la programación inteligente de turnos hasta el registro de evoluciones clínicas, la administración de especialistas y la comunicación automatizada con pacientes vía WhatsApp.

> **Estado actual:** En desarrollo activo · MVP funcional con módulos de Agenda, Pacientes, Historia Clínica y Especialistas operativos.

---

## 📑 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Base de Datos (Supabase)](#-base-de-datos-supabase)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Módulos y Funcionalidades](#-módulos-y-funcionalidades)
- [Reglas de Negocio](#-reglas-de-negocio)
- [Guía de Contribución](#-guía-de-contribución)
- [Convenciones de Código](#-convenciones-de-código)
- [Roadmap](#-roadmap)
- [Licencia](#-licencia)

---

## ✨ Características

### 📅 Agenda Inteligente
- Navegación por día con selector de fecha intuitivo
- **Smart Sorting:** Presentación priorizada por relevancia temporal (las citas próximas suben, las pasadas bajan)
- **Indicador "En Curso":** Badge animado verde con borde pulsante para la cita activa en el momento actual
- **Detección de Turnos Fantasmas:** Alertas visuales rojas para citas expiradas sin resolver (>1 hora sin gestión)
- Búsqueda por texto libre (nombre, apellido o DNI del paciente)
- Filtros combinados por Especialista, Estado y filtro computado "⚠️ Sin Resolver"
- **Búsqueda Global Histórica:** Toggle para explorar todas las citas pasadas y futuras sin límite de fecha
- Integración WhatsApp con plantillas de recordatorio y cancelación prearmadas
- Modal de confirmación personalizado para estados irreversibles (Cancelada / No Asistió)
- Creación rápida de pacientes directamente desde el formulario de nuevo turno

### 👤 Gestión de Pacientes
- Directorio de pacientes con búsqueda por nombre, apellido o documento
- Formulario de registro con validación dinámica según tipo de documento (DNI peruano: 8 dígitos, CE/Pasaporte: 6-12 alfanuméricos)
- Ficha clínica con antecedentes médicos estructurados (diabetes, hipertensión, enfermedad vascular, tratamiento oncológico, alergias)
- Acceso directo a la historia clínica desde el listado

### 📋 Historia Clínica y Evoluciones
- Registro de atenciones (evoluciones) vinculadas a paciente y cita
- Evaluación clínica con checkboxes de hallazgos en piel y uñas
- Registro de tratamientos realizados (multi-select)
- Campo de observaciones / indicaciones opcionales
- Flujo automatizado: desde la Agenda, el botón "Atender" redirige a la historia clínica con la cita pre-seleccionada

### 👨‍⚕️ Administración de Especialistas
- Directorio CRUD completo de podólogos / personal
- Asignación de color de etiqueta por especialista para identificación visual en la agenda
- Toggle de estado Activo/Inactivo con **validación de seguridad**: bloquea la inactivación si el especialista tiene citas pendientes (Programada, Confirmada o En Sala de Espera)
- Filtro automático: solo especialistas activos aparecen en el formulario de nuevo turno

### 🔔 Sistema de Notificaciones
- Toasts (`react-hot-toast`) con z-index elevado (`z-[99999]`) para garantizar visibilidad por encima de cualquier modal o drawer

---

## 🏗 Arquitectura y Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Runtime** | React 19 + TypeScript 5.9 | Componentes tipados y SPA reactiva |
| **Build Tool** | Vite 5.4 | Hot Module Replacement ultra-rápido |
| **Estilos** | Tailwind CSS 3.4 | Utility-first CSS framework |
| **Backend / DB** | Supabase (PostgreSQL) | BaaS con API auto-generada, auth y real-time |
| **Formularios** | React Hook Form + Zod | Validación declarativa de esquemas |
| **Routing** | React Router DOM 7 | Navegación SPA con rutas anidadas |
| **Notificaciones** | React Hot Toast | Toasts no-bloqueantes con prioridad visual |
| **Fechas** | date-fns + locale `es` | Formateo y aritmética de fechas en español |
| **Iconografía** | Lucide React | Iconos SVG minimalistas |

### Diagrama de Módulos

```
┌─────────────────────────────────────────────────┐
│                   App.tsx                       │
│            BrowserRouter + Toaster              │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │            MainLayout                    │    │
│  │  ┌──────────┐  ┌──────────────────┐     │    │
│  │  │ Sidebar  │  │     Header       │     │    │
│  │  │          │  ├──────────────────┤     │    │
│  │  │ - Dashboard │ │   <Outlet />     │     │    │
│  │  │ - Agenda │  │                  │     │    │
│  │  │ - Pacientes│ │  Rutas hijas:    │     │    │
│  │  │ - Personal │ │  /              │     │    │
│  │  │ - Caja   │  │  /agenda         │     │    │
│  │  │          │  │  /pacientes      │     │    │
│  │  │          │  │  /pacientes/:id/ │     │    │
│  │  │          │  │    historia      │     │    │
│  │  │          │  │  /especialistas  │     │    │
│  │  │          │  │  /caja           │     │    │
│  │  └──────────┘  └──────────────────┘     │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 📋 Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x
- Una cuenta en **[Supabase](https://supabase.com/)** con un proyecto creado
- Las tablas de base de datos configuradas (ver sección [Base de Datos](#-base-de-datos-supabase))

---

## 🚀 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/PodoFlow.git
cd PodoFlow

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (ver sección siguiente)
cp .env.example .env

# 4. Ejecutar en modo desarrollo
npm run dev
```

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo con HMR (puerto 5173) |
| `npm run build` | Compila TypeScript y genera build de producción en `/dist` |
| `npm run preview` | Previsualiza el build de producción localmente |
| `npm run lint` | Ejecuta ESLint para análisis estático de código |

---

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Supabase - Credenciales del proyecto
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu_clave_anonima
```

> **⚠️ Importante:** Nunca subas el archivo `.env` al repositorio. Asegúrate de que esté incluido en `.gitignore`.

El cliente de Supabase se inicializa en `src/lib/supabase.ts` y es importado por todos los módulos que necesiten acceso a datos.

---

## 🗄 Base de Datos (Supabase)

La aplicación requiere 4 tablas principales en tu proyecto de Supabase. A continuación se documenta el esquema completo:

### Tabla: `pacientes`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `UUID` | PK, auto-generado | Identificador único |
| `tipo_documento` | `ENUM('DNI','CE','PASAPORTE')` | NOT NULL, default `'DNI'` | Tipo de documento de identidad |
| `numero_documento` | `VARCHAR(12)` | UNIQUE, NOT NULL | Número del documento |
| `nombres` | `VARCHAR(255)` | NOT NULL | Nombres del paciente |
| `apellidos` | `VARCHAR(255)` | NOT NULL | Apellidos del paciente |
| `telefono` | `VARCHAR(20)` | nullable | Número de celular (formato 9 dígitos Perú) |
| `fecha_nacimiento` | `DATE` | nullable | Fecha de nacimiento |
| `sexo` | `VARCHAR` | nullable | Sexo del paciente |
| `alergias_alertas` | `TEXT` | nullable | Alertas generales de alergias |
| `diabetes` | `BOOLEAN` | default `false` | Antecedente de diabetes |
| `hipertension` | `BOOLEAN` | default `false` | Antecedente de hipertensión |
| `enfermedad_vascular` | `BOOLEAN` | default `false` | Antecedente de enfermedad vascular |
| `tratamiento_oncologico` | `BOOLEAN` | default `false` | En tratamiento oncológico |
| `alergias_detalle` | `TEXT` | nullable | Detalle de alergias específicas |
| `created_at` | `TIMESTAMPTZ` | auto-generado | Fecha de creación del registro |

**Índices:** `numero_documento`, `apellidos`

### Tabla: `podologos`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `UUID` | PK, auto-generado | Identificador único |
| `nombres` | `VARCHAR` | NOT NULL | Nombre completo del especialista |
| `dni` | `VARCHAR` | NOT NULL | Documento de identidad |
| `especialidad` | `VARCHAR` | nullable | Área de especialización |
| `telefono` | `VARCHAR` | nullable | Teléfono de contacto |
| `correo` | `VARCHAR` | nullable | Correo electrónico |
| `color_etiqueta` | `VARCHAR` | NOT NULL | Color HEX para identificación visual en agenda |
| `estado` | `BOOLEAN` | default `true` | Activo (`true`) / Inactivo (`false`) |

### Tabla: `citas`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `UUID` | PK, auto-generado | Identificador único |
| `paciente_id` | `UUID` | FK → `pacientes.id` | Paciente asignado |
| `podologo_id` | `UUID` | FK → `podologos.id` | Especialista asignado |
| `fecha_cita` | `DATE` | NOT NULL | Fecha de la cita |
| `hora_cita` | `TIME` | NOT NULL | Hora de inicio del turno |
| `motivo` | `TEXT` | NOT NULL | Motivo de consulta |
| `estado` | `VARCHAR` | NOT NULL | Estado actual del turno (ver estados válidos abajo) |
| `created_at` | `TIMESTAMPTZ` | auto-generado | Timestamp de creación |

**Estados válidos de la cita:**

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `Programada` | Inicial | Cita recién creada, pendiente de confirmar |
| `Confirmada` | Intermedio | Paciente confirmó asistencia |
| `En Sala de Espera` | Intermedio | Paciente llegó y espera ser atendido |
| `Atendida` | Final ❌ | Atención clínica completada (solo vía flujo clínico) |
| `Cancelada` | Final ❌ | Turno cancelado (requiere confirmación modal) |
| `No Asistió` | Final ❌ | Paciente no se presentó (requiere confirmación modal) |

> Los estados marcados como **Final ❌** son irreversibles: la tarjeta se atenúa y los controles se deshabilitan.

### Tabla: `atenciones`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `UUID` | PK, auto-generado | Identificador único |
| `paciente_id` | `UUID` | FK → `pacientes.id` | Paciente atendido |
| `podologo_id` | `UUID` | FK → `podologos.id` | Especialista que atendió |
| `cita_id` | `UUID` | FK → `citas.id`, nullable | Cita asociada (si vino desde la agenda) |
| `motivo_consulta` | `TEXT` | NOT NULL | Motivo de consulta |
| `tratamiento` | `TEXT` | nullable | Observaciones generales / tratamiento |
| `indicaciones` | `TEXT` | nullable | Indicaciones post-atención |
| `evaluacion_piel` | `TEXT[]` | nullable | Hallazgos clínicos en piel (array de strings) |
| `evaluacion_unas` | `TEXT[]` | nullable | Hallazgos clínicos en uñas (array de strings) |
| `tratamientos_realizados` | `TEXT[]` | NOT NULL | Procedimientos aplicados (mínimo 1) |
| `fecha_atencion` | `TIMESTAMPTZ` | auto-generado | Timestamp de la atención |

### Relaciones (Foreign Keys)

```
pacientes ──┐
             ├──► citas ◄── podologos
             │
             ├──► atenciones ◄── podologos
             │         │
             │         └──── citas (opcional)
```

---

## 📂 Estructura del Proyecto

```
src/
├── main.tsx                          # Entry point de React
├── App.tsx                           # Router principal + Toaster global
├── App.css                           # Estilos globales legacy (Vite template)
├── index.css                         # Tailwind directives (@tailwind base/components/utilities)
│
├── lib/
│   └── supabase.ts                   # Cliente Supabase (singleton)
│
├── config/
│   └── clinicData.ts                 # Datos estáticos de la clínica (nombre, dirección, teléfono)
│
├── components/
│   ├── WhatsAppIcon.tsx              # Componente SVG del ícono de WhatsApp
│   └── layout/
│       ├── MainLayout.tsx            # Shell principal: Sidebar + Header + <Outlet />
│       ├── Sidebar.tsx               # Navegación lateral con rutas
│       └── Header.tsx                # Barra superior
│
└── pages/
    ├── Dashboard.tsx                 # Página de inicio (resumen)
    ├── Caja.tsx                      # Módulo de caja (placeholder)
    │
    ├── agenda/
    │   ├── AgendaPage.tsx            # ★ Vista principal de la agenda diaria
    │   ├── schemas/
    │   │   └── citaSchema.ts         # Esquema Zod para validación de citas
    │   └── components/
    │       └── CitaDrawer.tsx         # Drawer lateral para crear/editar citas
    │
    ├── pacientes/
    │   ├── PacientesPage.tsx         # Listado y directorio de pacientes
    │   ├── HistoriaClinicaPage.tsx   # ★ Ficha clínica + timeline de evoluciones
    │   ├── schemas/
    │   │   ├── pacienteSchema.ts     # Esquema Zod para pacientes
    │   │   └── atencionSchema.ts     # Esquema Zod para atenciones/evoluciones
    │   └── components/
    │       ├── PacienteDrawer.tsx    # Drawer para crear/editar pacientes
    │       └── AtencionDrawer.tsx    # Drawer para registrar evoluciones clínicas
    │
    └── especialistas/
        ├── EspecialistasPage.tsx     # Directorio y gestión de personal
        ├── schemas/
        │   └── especialistaSchema.ts # Esquema Zod para especialistas
        └── components/
            └── EspecialistaDrawer.tsx # Drawer para crear/editar especialistas
```

---

## 📦 Módulos y Funcionalidades

### Agenda (`/agenda`) — `AgendaPage.tsx`

El módulo más complejo del sistema. Gestiona el ciclo de vida completo de las citas.

**Componentes clave:**
- **Date Navigator:** Selector de día con botones anterior/siguiente
- **Barra de Filtros:** Búsqueda por texto, filtro por especialista, filtro por estado
- **Toggle Global:** Switch para activar búsqueda histórica sin límite de fecha
- **Tarjetas de Cita:** Cards con color-coding por estado, indicador "En Curso", badge "Sin Resolver"
- **CitaDrawer:** Panel lateral con formulario de creación/edición de citas
- **Modal de Confirmación:** Diálogo personalizado para estados irreversibles

**Flujo de estados:**
```
Programada → Confirmada → En Sala de Espera → [Botón "Atender"] → Atendida
     │            │              │
     └────────────┴──────────────┴──→ Cancelada / No Asistió
```

**Smart Features:**
- El horario sugiere automáticamente el próximo slot libre al crear citas hoy
- Validación de doble reserva: no permite agendar al mismo especialista en la misma fecha/hora
- Slots de 30 minutos disponibles de 08:00 AM a 10:00 PM

### Pacientes (`/pacientes`) — `PacientesPage.tsx`

**Funcionalidades:**
- Tabla con búsqueda en tiempo real
- Drawer de creación/edición con validación condicional (DNI vs CE vs Pasaporte)
- Acceso a historia clínica por paciente

### Historia Clínica (`/pacientes/:id/historia`) — `HistoriaClinicaPage.tsx`

**Funcionalidades:**
- Ficha del paciente con datos personales y antecedentes
- Timeline de evoluciones clínicas ordenadas cronológicamente
- Drawer de nueva atención con evaluación clínica y tratamientos
- Entrada directa desde la Agenda (botón "Atender" con `cita_id` pre-cargado)

### Especialistas (`/especialistas`) — `EspecialistasPage.tsx`

**Funcionalidades:**
- Directorio con indicadores de color y estado
- CRUD completo con validación de seguridad en inactivación
- Solo personal activo aparece en los selectores de la agenda

---

## ⚖️ Reglas de Negocio

Estas reglas están implementadas en el frontend y deben respetarse al contribuir:

1. **Estado "Atendida" no es seleccionable manualmente.** Solo se activa cuando el especialista completa una atención clínica desde el botón "Atender" en la Agenda.

2. **Los estados "Cancelada" y "No Asistió" siempre requieren confirmación modal.** Nunca se procesan con un simple cambio del `<select>`.

3. **Los estados finales son irreversibles.** Una vez que una cita está en `Atendida`, `Cancelada` o `No Asistió`, los controles de edición se deshabilitan visualmente.

4. **Validación de doble reserva.** No se puede asignar al mismo especialista dos citas en la misma fecha y hora. Las citas en estado `Cancelada` o `CANCELADA` se excluyen de esta validación (manejo de case-sensitivity).

5. **Protección de inactivación.** Un especialista no puede marcarse como inactivo si tiene citas en estados abiertos (`Programada`, `Confirmada`, `En Sala de Espera`).

6. **Turnos Fantasmas.** Una cita se considera "Sin Resolver" si su fecha ya pasó, o si es de hoy pero ya transcurrió más de 1 hora, y sigue en un estado no-final.

7. **Formato de teléfono Perú.** Los números de 9 dígitos se anteponen con `51` para la URL de WhatsApp (`wa.me/51XXXXXXXXX`).

---

## 🤝 Guía de Contribución

### Cómo empezar

1. Haz fork del repositorio
2. Crea una rama para tu feature: `git checkout -b feature/nombre-feature`
3. Realiza tus cambios siguiendo las convenciones de código
4. Haz commit con mensajes descriptivos: `git commit -m "feat: agregar módulo de reportes"`
5. Haz push a tu rama: `git push origin feature/nombre-feature`
6. Abre un Pull Request describiendo los cambios

### Convención de commits

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `refactor:` | Refactorización sin cambio funcional |
| `style:` | Cambios de UI/CSS |
| `docs:` | Documentación |
| `chore:` | Tareas de mantenimiento |

---

## 📐 Convenciones de Código

### Patrones importantes

- **Formularios:** Usar siempre `react-hook-form` + `zodResolver` con esquemas en `schemas/`. Nunca manejar estado de formulario manualmente.
- **Drawers (Paneles laterales):** Todos usan `fixed inset-0 z-[9999]` como contenedor. Si un modal se renderiza *encima* de un drawer, usar `z-[20050]` o superior.
- **Consultas Supabase:** Ejecutar en `useEffect` o en event handlers `async`. Usar `toast.success()` / `toast.error()` para feedback.
- **Estado de citas:** Siempre comparar con strings exactos incluyendo mayúsculas y tildes: `'No Asistió'`, `'En Sala de Espera'`, `'CANCELADA'`.

### Jerarquía de Z-Index

| Capa | Z-Index | Elemento |
|------|---------|----------|
| Layout (Header/Sidebar) | `z-30` - `z-40` | Navegación principal |
| Drawers principales | `z-[9999]` | Paneles laterales de CRUD |
| Modales secundarios | `z-[20050]` | Modales que se abren sobre drawers |
| Toasts (Notificaciones) | `z-[99999]` | Mensajes del sistema, siempre encima |

### Paleta de colores del sistema

| Nombre | Hex | Uso |
|--------|-----|-----|
| Primary (Verde) | `#00C288` | Acciones positivas, badges activos |
| Secondary (Azul oscuro) | `#004975` | Sidebar, encabezados, tipografía primaria |
| Danger | `red-500` | Cancelaciones, alertas críticas |
| Warning | `orange-500` | Estado "En Sala de Espera" |
| Muted | `slate-600` | Estado "No Asistió" |

---

## 🗺 Roadmap

- [ ] **Módulo de Caja:** Registro de pagos y facturación por atención
- [ ] **Dashboard con métricas:** KPIs de citas del día, inasistencias y productividad por especialista
- [ ] **Autenticación:** Login con Supabase Auth + roles (Admin / Recepción / Especialista)
- [ ] **RLS (Row Level Security):** Políticas de seguridad a nivel de base de datos
- [ ] **Reportes exportables:** Generación de PDF de historial clínico y estadísticas
- [ ] **Notificaciones push:** Recordatorios automáticos 24h antes de la cita
- [ ] **Modo responsive:** Optimización completa para tablets y móviles
- [ ] **Multi-sucursal:** Soporte para gestión de múltiples sedes

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<p align="center">
  Desarrollado con ❤️ para la comunidad de especialistas en podología
</p>
