# Detalles Técnicos y Base de Datos

Este documento contiene la información detallada sobre la arquitectura de datos, reglas de negocio y convenciones de código para PodoFlow.

## 🗄 Base de Datos (Supabase)

La aplicación requiere 4 tablas principales en el proyecto de Supabase. A continuación se documenta el esquema completo:

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

```text
pacientes ──┐
             ├──► citas ◄── podologos
             │
             ├──► atenciones ◄── podologos
             │         │
             │         └──── citas (opcional)
```

## ⚖️ Reglas de Negocio

Estas reglas están implementadas en el frontend y deben respetarse al contribuir:

1. **Estado "Atendida" no es seleccionable manualmente.** Solo se activa cuando el especialista completa una atención clínica desde el botón "Atender" en la Agenda.
2. **Los estados "Cancelada" y "No Asistió" siempre requieren confirmación modal.** Nunca se procesan con un simple cambio del `<select>`.
3. **Los estados finales son irreversibles.** Una vez que una cita está en `Atendida`, `Cancelada` o `No Asistió`, los controles de edición se deshabilitan visualmente.
4. **Validación de doble reserva.** No se puede asignar al mismo especialista dos citas en la misma fecha y hora. Las citas en estado `Cancelada` o `CANCELADA` se excluyen de esta validación.
5. **Protección de inactivación.** Un especialista no puede marcarse como inactivo si tiene citas en estados abiertos.
6. **Turnos Fantasmas.** Una cita se considera "Sin Resolver" si su fecha ya pasó, o si es de hoy pero ya transcurrió más de 1 hora, y sigue en un estado no-final.
7. **Formato de teléfono Perú.** Los números de 9 dígitos se anteponen con `51` para la URL de WhatsApp.

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
