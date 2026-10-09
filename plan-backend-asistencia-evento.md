# Plan: Backend de asistencia para el evento

Backend para registrar asistencia a un evento con **4 jornadas** (mañana y tarde, durante 2 días), sorteos por jornada y estadísticas en tiempo real.

**Stack:** Node.js 20+, Express (JS), MongoDB Atlas (Free Tier M0), Mongoose, Socket.IO, JWT, Zod.

---

## 1. Reglas de negocio

1. Un usuario se registra por primera vez con **todos sus datos**. El primer dato solicitado es el número de identificación.
2. Si el documento ya existe, el sistema **no vuelve a pedir los datos**: crea un nuevo registro de asistencia **idéntico al anterior**, con la nueva jornada (y el nuevo día si aplica).
3. La asistencia cuenta únicamente para la jornada en la que se registró.
4. Un mismo documento puede asistir:
   - a la mañana y a la tarde del **mismo día**,
   - a la **misma jornada en días distintos**,
   - a varias jornadas en varios días.
5. **Sorteo cada 2 horas.** El ADMIN selecciona qué jornadas participan. Ejemplo: a las 12:30 p.m. cuentan la jornada de la mañana y los registrados hasta ese momento en la tarde; en un sorteo posterior puede seleccionar solo la tarde.
6. Los endpoints de **sorteo** y **estadísticas en tiempo real** requieren login. Los de **asistencia** son públicos.

---

## 2. Decisiones técnicas clave

- **Tiempo real:** Socket.IO (namespace `/stats`) en lugar de polling. Al registrarse alguien, el servidor emite el evento y la pantalla grande actualiza los números.
- **Concurrencia:** la unicidad la garantiza un **índice único en MongoDB** `(documento, fecha, turno)`, no un "buscar y luego insertar".
- **Zona horaria:** toda la lógica de jornadas usa `America/Bogota`. La fecha se guarda como string `YYYY-MM-DD` para evitar cambios de día por conversión a UTC.
- **Librerías de apoyo:** `helmet`, `express-rate-limit`, `bcrypt`/`argon2`, `zod`.

---

## 3. Modelo de datos

### `jornadas` (se siembran 4 documentos)

```js
{
  _id,
  fecha: "2026-10-15",          // YYYY-MM-DD, hora de Bogotá
  turno: "MANANA" | "TARDE",
  clave: "2026-10-15-M",
  inicio: Date,
  fin: Date,
  activa: Boolean
}
// Índice único: { fecha: 1, turno: 1 }
```

### `participantes` (datos canónicos, un documento por persona)

```js
{
  documento,                    // único
  tipoDocumento, nombres, apellidos, correo, telefono,
  /* ...campos del formulario completo */
  aceptaTratamientoDatos: Boolean,
  createdAt
}
// Índice único: { documento: 1 }
```

### `asistencias` (un registro por persona, por día y por jornada)

```js
{
  participanteId,
  documento,
  jornadaId,
  fecha, turno,                 // desnormalizados a propósito
  datos: { /* copia idéntica de los datos del participante */ },
  primeraVez: Boolean,
  createdAt
}
// Índice único de concurrencia: { documento: 1, fecha: 1, turno: 1 }
// Índice de consulta:           { jornadaId: 1 }
```

| Caso | Resultado |
|---|---|
| Mismo día, mañana y tarde | Permitido (turno distinto) |
| Misma jornada, días distintos | Permitido (fecha distinta) |
| Varias jornadas en varios días | Permitido |
| Mismo documento, misma fecha y mismo turno | `409`, rechazado por el índice incluso con peticiones simultáneas |

### `sorteos`

```js
{
  numeroSorteo,
  premio,
  jornadasParticipantes: [jornadaId, ...],
  totalElegibles,               // para auditoría
  ganadorDocumento,
  ganadorDatos,                 // snapshot del ganador
  realizadoPor,
  createdAt
}
// Índice único: { ganadorDocumento: 1 }   (una persona gana una sola vez en el evento)
```

### `usuarios` (administradores y presentadores)

```js
{ email (único), passwordHash, rol: "ADMIN" | "PRESENTADOR", activo }
```

---

## 4. Endpoints

### Públicos (sin token)

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/jornadas/actual` | Jornada vigente según la hora del servidor |
| `POST` | `/api/asistencias/verificar` | Body `{ documento }`. Devuelve `{ existe, yaAsistioEnJornadaActual }` |
| `POST` | `/api/asistencias` | Registra la asistencia (flujo en la sección 5) |

> El endpoint de verificar es público: debe devolver **solo booleanos**, nunca nombres ni datos personales.

### Autenticados (JWT)

| Método | Ruta | Rol | Función |
|---|---|---|---|
| `POST` | `/api/auth/login` | público | Devuelve access token + refresh token |
| `POST` | `/api/auth/refresh` | público | Renueva el access token |
| `POST` | `/api/auth/logout` | auth | Invalida el refresh token |
| `GET` | `/api/auth/me` | auth | Datos del usuario |
| `POST` | `/api/auth/register` | **ADMIN** | Crea usuarios |
| `GET` | `/api/jornadas?conRegistros=true` | ADMIN | Solo jornadas con al menos una asistencia, con su conteo |
| `POST` | `/api/sorteos` | ADMIN | Realiza un sorteo sobre las jornadas seleccionadas |
| `GET` | `/api/sorteos` | auth | Historial de ganadores |
| `GET` | `/api/estadisticas` | auth | Foto actual de las estadísticas (carga inicial) |
| `GET` | `/api/asistencias?jornada=` | ADMIN | Listado para exportar (CSV) |

> `register` no debe ser público: si lo fuera, cualquiera podría crearse una cuenta y ejecutar sorteos. El primer admin se crea con un script de semilla (`npm run seed`).

---

## 5. Flujo de `POST /api/asistencias`

Un solo endpoint con dos caminos:

1. Llega `{ documento }` (y opcionalmente el resto de datos).
2. Se determina la jornada actual (fecha + turno).
3. Si el documento **ya existe** en `participantes`: se crea la asistencia copiando sus datos → `201`. Si ya tenía asistencia en esa fecha y turno → `409` con mensaje claro.
4. Si **no existe** y vienen todos los datos: se crea el participante y la asistencia con `primeraVez: true`.
5. Si **no existe** y faltan datos: `422` con código `REQUIERE_REGISTRO_COMPLETO`, para que el frontend muestre el formulario completo.
6. Tras guardar, se emite `stats:update` por Socket.IO.

---

## 6. Sorteo con jornadas seleccionadas

### Jornadas disponibles

`GET /api/jornadas?conRegistros=true` devuelve solo las jornadas con asistencias:

```json
[
  { "id": "...", "fecha": "2026-10-15", "turno": "MANANA", "totalAsistentes": 142 },
  { "id": "...", "fecha": "2026-10-15", "turno": "TARDE",  "totalAsistentes": 37 }
]
```

El conteo es actual al momento de consultar (los registros siguen entrando). El admin lo vuelve a pedir justo antes de sortear.

### Realizar el sorteo

`POST /api/sorteos`

```json
{ "jornadaIds": ["<mañana>", "<tarde>"], "premio": "Tablet" }
```

**Flujo del servicio:**

1. Validar que `jornadaIds` no esté vacío, que los IDs existan y que cada jornada tenga registros.
2. Construir el universo de participantes **desduplicado por documento**.
3. Excluir a quienes ya ganaron.
4. Escoger uno al azar y guardarlo.

**Desduplicación:** si alguien asistió a la mañana y a la tarde y ambas están seleccionadas, aparece dos veces en `asistencias`. Sin agrupar tendría el doble de probabilidad de ganar.

```js
const ganadores = await Sorteo.distinct("ganadorDocumento");

const [elegido] = await Asistencia.aggregate([
  { $match: { jornadaId: { $in: jornadaIds }, documento: { $nin: ganadores } } },
  { $group: { _id: "$documento", asistenciaId: { $first: "$_id" }, datos: { $first: "$datos" } } },
  { $sample: { size: 1 } }
]);
```

**Doble clic o dos admins a la vez:** si el insert del ganador falla por clave duplicada (`E11000`), el servicio vuelve a sortear automáticamente, con un máximo de reintentos.

**Respuesta:** incluye el ganador y el número de elegibles. Además se emite `sorteo:ganador` por Socket.IO para la pantalla grande.

---

## 7. Estadísticas en tiempo real

**Socket.IO con namespace `/stats`**, autenticado en el handshake con el JWT.

| Evento | Cuándo |
|---|---|
| `stats:snapshot` | Al conectarse (estado completo) |
| `stats:update` | Cada vez que se registra una asistencia |
| `sorteo:ganador` | Cuando se realiza un sorteo |

**Payload sugerido:**

```json
{
  "jornadaActual": { "clave": "2026-10-15-M", "total": 142, "primeraVez": 98, "recurrentes": 44 },
  "porJornada": [{ "clave": "2026-10-15-M", "total": 142 }],
  "porDia": [{ "fecha": "2026-10-15", "total": 179 }],
  "asistentesUnicos": 310,
  "totalAsistencias": 455,
  "ultimaHora": [{ "hora": "09:00", "total": 37 }],
  "actualizadoEn": "..."
}
```

**Métricas:**

- Asistentes únicos del evento (agrupando por `documento`).
- Total de asistencias (suma de registros por jornada).
- Por día y por jornada.
- Nuevos vs. recurrentes (`primeraVez`).

**Rendimiento:** para cientos o pocos miles de asistentes, un `aggregate` con `$facet` es suficiente. Si hay ráfagas de registros, agrupar las emisiones con *debounce* de ~500 ms. En el frontend, animar los contadores al cambiar.

**Escalado:** con una sola instancia se emite desde el mismo proceso. Con varias instancias se necesitaría el adaptador de Redis para Socket.IO o *change streams* de MongoDB.

---

## 8. Seguridad y cumplimiento

- Rate limit estricto en `/api/asistencias` y `/api/auth/login`.
- `helmet`, CORS restringido al dominio del frontend, validación con Zod en todos los bodies.
- Contraseñas con bcrypt/argon2; access token corto (15 min) y refresh token rotatorio.
- **Habeas Data (Ley 1581 de 2012):** el formulario incluye la autorización de tratamiento de datos (`aceptaTratamientoDatos`) y los datos personales no se exponen en endpoints públicos.
- Variables sensibles solo en `.env` (nunca en el repositorio).

---

## 9. MongoDB Atlas Free Tier (M0)

- Alcanza para este caso: 512 MB y hasta 500 conexiones.
- Usar **una sola conexión de Mongoose reutilizada**, no una por petición.
- Agregar la IP del servidor a la lista de acceso de Atlas.
- M0 no tiene respaldos automáticos continuos: hacer `mongodump` antes y después de cada día del evento.
- Probar la latencia desde el lugar de despliegue; si el servidor está lejos de la región del clúster se nota.

---

## 10. Despliegue

Se necesita un host que soporte **WebSockets y procesos persistentes** (Render, Railway, Fly.io o un VPS). Evitar plataformas serverless puras para el servidor de sockets, y tener cuidado con planes gratuitos que "duermen" el servicio: un arranque en frío en plena entrada del evento sería un problema.

---

## 11. Fases sugeridas

1. **Base:** proyecto, conexión a Atlas, modelos, script de semilla (jornadas + admin).
2. **Asistencia:** verificar + registrar con el flujo de dos caminos y pruebas de concurrencia (dos peticiones simultáneas con la misma cédula, fecha y turno).
3. **Auth:** login, refresh, roles, register solo admin.
4. **Jornadas y sorteos:** listado de jornadas con registros, sorteo con selección de jornadas, desduplicación, exclusión de ganadores, historial.
5. **Tiempo real:** Socket.IO, snapshot + updates, página de prueba con los contadores.
6. **Endurecimiento:** rate limit, logs, exportación CSV, pruebas de carga (por ejemplo con `autocannon`) y ensayo general antes del evento.

---

## 12. Decisiones pendientes

1. **Ganadores:** se propone que una persona gane **una sola vez en todo el evento**. Si se prefiere otra regla (una vez por ronda o sin límite), solo cambia el índice único de `sorteos` y el filtro `$nin`.
2. **Jornadas sin registros:** se propone que no se puedan seleccionar para un sorteo (el endpoint solo lista las que tienen asistencias).
3. **Apertura de jornadas:** definir si se detectan **automáticamente por hora** o si un admin las **abre/cierra manualmente** (más robusto si el evento se atrasa).
4. **Disparo del sorteo:** se propone que lo ejecute manualmente un ADMIN cuando corresponda, no un temporizador.
5. **Campos del formulario completo:** necesarios para cerrar el esquema de `participantes`.
