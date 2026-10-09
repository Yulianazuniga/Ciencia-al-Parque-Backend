# Backend de asistencia al evento

API REST para registrar asistencia a un evento de **4 jornadas** (2 días × mañana/tarde),
realizar **sorteos por jornadas seleccionadas** y mostrar **estadísticas en tiempo real**.

Stack: Node.js 20 · Express 5 (ESM) · MongoDB · Mongoose 8 · Socket.IO · JWT · Zod · Swagger.

## Requisitos

- Node.js ≥ 20
- MongoDB disponible en `mongodb://localhost:27017` (ajustable en `.env`)

## Configuración

```bash
cp .env.template .env   # en Windows: copy .env.template .env
# edita .env con credenciales reales
npm install
npm run seed            # crea admin + 4 jornadas (idempotente)
npm run dev             # nodemon en http://localhost:4000
```

El admin inicial se define con `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.
Las fechas del evento se configuran con `EVENTO_FECHA_DIA1` y `EVENTO_FECHA_DIA2`
(default: `2026-10-15` y `2026-10-16`).

> Si durante el evento las fechas reales no coinciden con las sembradas, la jornada
> vigente se crea automáticamente al registrar la primera asistencia del día.

## Estructura

```
auth/  jornadas/  asistencias/  sorteos/  estadisticas/   # un módulo = una carpeta
  └── controllers/ routes/ services/   (+ sockets/ en estadisticas)
config/   database/   libs/   models/   shared/middlewares/   utils/   scripts/
app.js    # middlewares globales + montaje de routers
index.js  # bootstrap: connectDB + http server + Socket.IO (/stats)
```

## Reglas de negocio implementadas

- **Jornada vigente (asistencia):** automática por hora de Bogotá — antes de las 12:00
  es `MANANA`, después `TARDE`. Ocurre lo mismo para la fecha (`America/Bogota`).
- **Flujo de dos caminos:** con `{ documento }` y el documento ya existe, se clona el
  registro (`primeraVez: false`) sin volver a pedir datos. Si no existe y faltan campos
  → `422` con `code: REQUIERE_REGISTRO_COMPLETO`.
- **Concurrencia:** índice único `(documento, fecha, turno)`. Dos peticiones simultáneas
  de la misma cédula en la misma jornada → una `201` y la otra `409`.
- **Sorteos:** el ADMIN selecciona jornadas; se desduplica por documento, se excluyen
  ganadores previos (`una persona gana una sola vez en el evento`) y se reintenta ante
  colisiones (`E11000`).
- **Verificar es público y solo devuelve booleanos**: nunca nombres ni datos personales.

## Endpoints

### Públicos
| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/jornadas/actual` | Jornada vigente según la hora del servidor |
| `POST` | `/api/asistencias/verificar` | `{ documento }` → `{ existe, yaAsistioEnJornadaActual }` |
| `POST` | `/api/asistencias` | Registra asistencia (flujo de dos caminos) |

### Autenticados (JWT)
| Método | Ruta | Rol | Función |
|---|---|---|---|
| `POST` | `/api/auth/login` | público | access + refresh token (rate limit) |
| `POST` | `/api/auth/refresh` | público | Rota el refresh token |
| `POST` | `/api/auth/logout` | auth | Invalida el refresh token |
| `GET` | `/api/auth/me` | auth | Datos del usuario |
| `POST` | `/api/auth/register` | ADMIN | Crea usuarios |
| `GET` | `/api/jornadas?conRegistros=true` | ADMIN | Solo jornadas con asistencias y su conteo |
| `POST` | `/api/sorteos` | ADMIN | Sorteo sobre jornadas seleccionadas |
| `GET` | `/api/sorteos` | auth | Historial de ganadores |
| `GET` | `/api/estadisticas` | auth | Snapshot de estadísticas |
| `GET` | `/api/asistencias?jornada=&formato=csv` | ADMIN | Listado para exportar |

### Otros
- `GET /api-docs` → Swagger UI
- `GET /health` → estado del servicio
- `GET /stats-test.html` → página de prueba de los contadores en tiempo real

## Tiempo real (Socket.IO, namespace `/stats`)

Autenticado en el handshake con el JWT (`socket.auth.token`).

| Evento | Cuándo |
|---|---|
| `stats:snapshot` | Al conectarse |
| `stats:update` | Cada asistencia registrada (debounce 500 ms) |
| `sorteo:ganador` | Cuando ADMIN realiza un sorteo |

## Pruebas

```bash
node scripts/test-concurrencia.js   # 8 altas simultáneas del mismo documento → 1 éxito, 7 duplicados
node scripts/test-sockets.js        # snapshot + stats:update + sorteos:ganador de punta a punta
npm run check                       # syntax-check + eslint
```

## Seguridad

- `helmet`, CORS restringido al frontend, rate limit en `/api/asistencias` y `/api/auth/login`.
- Validación Zod en todos los bodies; contraseñas con `bcryptjs`.
- Access token de 15 min; refresh token rotatorio (7 días) revocable e invalidable.
- Habeas Data (Ley 1581): el formulario exige `aceptaTratamientoDatos: true`; los datos
  personales nunca se exponen en endpoints públicos.
- Variables sensibles solo en `.env` (nunca versionado).