---
name: backend-modular-api
description: Use when building or extending a Node.js + Express + MongoDB (Mongoose) backend organized into domain modules, each with its own controllers/services/routes (plus optional external integrations like Google Sheets), shared middlewares, config, models and libs. Defines the canonical directory structure and the route -> middleware -> controller -> service -> model flow the AI must follow. Triggers: estructura de carpetas backend, nuevo modulo, controller, service, route, middleware, mongoose model, .env.template, /api routes, JWT auth, verifyRole, swagger.
---

# Backend modular API (Node.js + Express + MongoDB)

Plantilla de arquitectura reutilizable para APIs REST. Deriva de un backend real en
producción y describe **bajo qué estructura de directorios** se debe construir y
extender el proyecto. Es agnóstica al dominio: reemplaza `<modulo>` por el recurso
que corresponda (users, products, orders, convocatorias, etc.).

## Cuándo usarlo

- Crear un backend Node.js/Express con MongoDB desde cero con esta estructura.
- Agregar un nuevo módulo/dominio a un backend existente de esta forma.
- Decidir dónde va cada archivo (controller vs service vs model vs lib).
- Recordar convenciones transversales (ESM, env, rutas `/api`, JWT, swagger).

## Stack de referencia

- Node.js >= 18, ESM (`"type": "module"`).
- Express 5.
- MongoDB Atlas + Mongoose 8 (ODM).
- Autenticación JWT (`jsonwebtoken`) + hashing (`bcryptjs`).
- Documentación OpenAPI (`swagger-jsdoc` + `swagger-ui-express`).
- Logging HTTP (`morgan`), CORS (`cors`), entorno (`dotenv`).
- Utilidades opcionales: `exceljs` (reportes), `nodemailer` (email),
  `googleapis` (integraciones externas).

## Estructura de directorios canónica

```
proyecto/
├── <modulo>/                     # una carpeta por dominio/recurso
│   ├── controllers/              # capa HTTP
│   │   └── <modulo>.controller.js
│   ├── routes/                   # definición de endpoints + docs OpenAPI
│   │   └── <modulo>.routes.js
│   ├── services/                 # lógica de negocio + acceso a datos
│   │   └── <modulo>.service.js
│   └── sheets/                   # (opcional) integración externa del módulo
│       └── <servicio>.service.js
├── config/                       # variables de entorno y configuración
│   ├── config.js                 # env del servidor (PORT, etc.)
│   ├── databaseCredentials.js    # credenciales de BD (MONGODB_URI)
│   ├── token.js                  # secretos JWT, roles, URLs de CORS, ids de integraciones
│   └── swagger.js                # definición OpenAPI + schemas
├── database/
│   └── database.js               # connectDB() con Mongoose
├── libs/                         # clientes/librerías compartidas (singleton)
│   ├── jwt.js                    # helpers de firma de tokens
│   └── <servicio>/
│       └── <servicio>Client.plugin.js
├── models/                       # un esquema Mongoose por archivo
│   └── <Modulo>.js
├── shared/
│   └── middlewares/              # middlewares reutilizables
│       ├── verifyToken.js
│       └── verifyRole.js
├── utils/                        # helpers puros (tokens, formateos)
│   └── <helper>.js
├── scripts/                      # scripts CLI de un solo uso
│   └── <tarea>.js
├── app.js                        # crea la app Express, middlewares globales, monta routers
├── index.js                      # entrypoint: connectDB() + app.listen
├── .env.template                 # TODAS las variables requeridas (vacías)
├── .env                          # valores reales (NO versionado)
├── .gitignore
├── eslint.config.js
├── package.json
└── vercel.json                   # (si despliega en Vercel)
```

Reglas de la estructura:

- **Un módulo = una carpeta de primer nivel** con su propio `controllers/`,
  `routes/` y `services/`. No hay carpetas globales de controllers/services.
- Lo **transversal** vive en `config/`, `libs/`, `models/`, `shared/`,
  `utils/`, `database/`.
- El nombre de la carpeta del módulo va en `camelCase` (`planFinanciero`);
  el recurso HTTP va en `kebab-case` (`/api/plan-financiero`).

## Flujo de una petición (regla de oro)

```
index.js  ->  connectDB()  ->  app.listen(PORT)
app.js    ->  cors, express.json, morgan, swagger, monta routers
router    ->  verifyToken -> verifyRole([...roles]) -> controller
controller->  lee req.{params,query,body,user}; llama service; responde
service   ->  valida, opera con Mongoose, efectos externos (email/sheets)
model     ->  esquema/tipos Mongoose
```

Cada capa tiene una única responsabilidad:

- **routes/**: crea `express.Router()`, asocia middlewares + controladores,
  define método y path, y documenta con bloques `@openapi`.
- **controllers/**: **solo HTTP**. Extrae datos de `req`, llama al service,
  responde con `res.status(...).json(...)`. Envuelve en `try/catch` y mapea
  errores: validación → 400, no encontrado → 404, resto → 500.
- **services/**: **lógica de negocio y datos**. Valida, consulta/escribe
  Mongoose, dispara integraciones. Lanza `Error` con mensajes que el
  controller interpreta (`"X not found"`, `"... is required"`).
- **models/**: un schema Mongoose por archivo, export nombrado
  `export const X = mongoose.model("X", schema)`.

Skeletons mínimos:

`<modulo>/routes/<modulo>.routes.js`
```js
import { Router } from "express";
import * as controller from "../controllers/<modulo>.controller.js";
import { verifyToken } from "../../shared/middlewares/verifyToken.js";
import { verifyRole } from "../../shared/middlewares/verifyRole.js";

const router = Router();

router.get("/get", verifyToken, controller.getAll);
router.get("/get/:id", verifyToken, controller.getById);
router.post("/upload", verifyToken, verifyRole(["superadmin", "dinamizador"]), controller.create);
router.patch("/update/:id", verifyToken, controller.update);
router.delete("/delete/:id", verifyToken, verifyRole(["superadmin"]), controller.remove);

export default router;
```

`<modulo>/controllers/<modulo>.controller.js`
```js
import * as service from "../services/<modulo>.service.js";

export const getAll = async (req, res) => {
  try {
    res.json(await service.getAll());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    res.json(item);
  } catch (error) {
    const status = error.message === "Not found" ? 404 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const item = await service.create(req.body, req.user?.id);
    res.status(201).json(item);
  } catch (error) {
    const message = error.message || "Unexpected error";
    const isValidation = message.includes("required") || message.includes("must");
    res.status(isValidation ? 400 : 500).json({ message });
  }
};

export const update = async (req, res) => {
  try {
    res.json(await service.update(req.params.id, req.body));
  } catch (error) {
    res.status(error.message === "Not found" ? 404 : 500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    res.json(await service.remove(req.params.id));
  } catch (error) {
    res.status(error.message === "Not found" ? 404 : 500).json({ message: error.message });
  }
};
```

`<modulo>/services/<modulo>.service.js`
```js
import { Modulo } from "../../models/Modulo.js";

export const getAll = async () => Modulo.find();

export const getById = async (id) => {
  const item = await Modulo.findById(id);
  if (!item) throw new Error("Not found");
  return item;
};

export const create = async (data, userId) => {
  if (!data) throw new Error("Data is required");
  const item = new Modulo({ ...data, user_id: userId });
  return item.save();
};

export const update = async (id, data) => {
  const item = await getById(id);
  Object.assign(item, data);
  return item.save();
};

export const remove = async (id) => {
  const item = await getById(id);
  await item.deleteOne();
  return { message: "Deleted" };
};
```

`models/Modulo.js`
```js
import mongoose from "mongoose";

const moduloSchema = new mongoose.Schema(
  { name: { type: String, required: true, maxlength: 200 } },
  { timestamps: true }
);

export const Modulo = mongoose.model("Modulo", moduloSchema);
```

## app.js e index.js

`app.js` concentra middlewares globales y monta cada router bajo
`/api/<recurso>`; separa la app del arranque para poder testear/desplegar.

```js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import moduloRouter from "./<modulo>/routes/<modulo>.routes.js";
import { FRONTEND_PROD_URL, FRONTEND_DEV_URL } from "./config/token.js";

const app = express();

app.use(cors({ origin: [FRONTEND_DEV_URL, FRONTEND_PROD_URL], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/<recurso>", moduloRouter);

export default app;
```

`index.js` hace únicamente el bootstrap:

```js
import app from "./app.js";
import { PORT } from "./config/config.js";
import { connectDB } from "./database/database.js";

async function main() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server on port ${PORT}`));
  } catch (error) {
    console.log(error);
  }
}

main();
```

## Configuración y variables de entorno

- `.env.template` lista **todas** las variables (vacías) agrupadas por bloque:
  servidor, base de datos, auth/roles, integraciones externas, CORS.
- `.env` contiene valores reales y **siempre** va en `.gitignore`.
- Ningún archivo lee `process.env` directamente salvo `config/*.js`; el resto
  importa desde `config/`.

`.env.template` de ejemplo:
```env
# Server
PORT=

# Database
MONGODB_URI=

# Auth / roles
TOKEN_SECRET=
SUPER_ADMIN_ROLE=
ADMIN_ROLE=
DINAMIZADOR_ROLE=
USER_ROLE=

# External integrations
SERVICE_ACCOUNT_JSON=
SPREAD_SHEET_ID=
SHEET_NAME=

# CORS (frontends)
FRONTEND_DEV_URL=
FRONTEND_STG_URL=
FRONTEND_PROD_URL=
```

`config/token.js` re-exporta las variables usadas por la app:
```js
import dotenv from "dotenv";
dotenv.config();

export const TOKEN_SECRET = process.env.TOKEN_SECRET;
export const SUPER_ADMIN_ROLE = process.env.SUPER_ADMIN_ROLE;
export const FRONTEND_PROD_URL = process.env.FRONTEND_PROD_URL;
// ...
```

`database/database.js`:
```js
import mongoose from "mongoose";
import { MONGODB_URI } from "../config/databaseCredentials.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("DB connection established");
  } catch (error) {
    console.error("DB connection error:", error);
    process.exit(1);
  }
};
```

## Middlewares compartidos (`shared/middlewares/`)

`verifyToken.js`: valida el header `Authorization: Bearer <token>` y deja el
payload decodificado en `req.user`.

```js
import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../../config/token.js";

export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token not provided" });

  jwt.verify(token, TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
};
```

`verifyRole.js`: fábrica que retorna un middleware; acepta un string o un array
de roles permitidos.

```js
export const verifyRole = (allowedRoles) => (req, res, next) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: "Access forbidden: Insufficient role" });
  }
  next();
};
```

## Integraciones externas (patrón `libs` + `sheets`)

- El **cliente** (credenciales, conexión) es un singleton compartido en
  `libs/<servicio>/<servicio>Client.plugin.js`, leído una sola vez.
- La **lógica por módulo** vive en `<modulo>/sheets/<servicio>.service.js` y
  expone funciones idempotentes `add*`, `update*`, `delete*`.
- Las operaciones se identifican por el id del documento en la primera columna
  y los encabezados se autogestionan (upsert de headers).
- Las credenciales se leen de `config/` (nunca hardcodeadas) y en producción se
  inyectan como JSON en una variable de entorno.

```js
// libs/external/externalClient.plugin.js
import "dotenv/config";
import { Client } from "external-sdk";

const credentials = process.env.SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.SERVICE_ACCOUNT_JSON)
  : undefined;

export const externalClient = new Client({ credentials });
```

## Documentación OpenAPI

- Cada ruta se documenta con un bloque JSDoc `@openapi` justo encima de su
  definición en `routes/`.
- Los `schemas` reutilizables y la config global (info, servers, security
  `bearerAuth`) van en `config/swagger.js`.
- El arreglo `apis` debe apuntar a cada módulo: `"./<modulo>/routes/*.routes.js"`.

## package.json (scripts y metadatos)

```json
{
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "syntax-check": "node --check index.js",
    "lint": "eslint . --ext .js",
    "check": "yarn syntax-check && yarn lint"
  }
}
```

`.gitignore` mínimo: `node_modules/`, `.env`, `*.log`, credenciales `*.json`.

## Receta: agregar un nuevo módulo

1. Crear carpeta `<modulo>/` con `controllers/`, `routes/`, `services/`.
2. Definir el modelo en `models/<Modulo>.js`.
3. Implementar `<modulo>.service.js` (validaciones + Mongoose + efectos).
4. Implementar `<modulo>.controller.js` (capa HTTP + mapeo de errores).
5. Crear `<modulo>.routes.js` con `Router()`, middlewares y docs `@openapi`.
6. Montar en `app.js`: `app.use("/api/<recurso>", <modulo>Router)`.
7. Registrar el schema y el path en `config/swagger.js`.
8. (Opcional) Si sincroniza con un servicio externo, crear el cliente en
   `libs/` y `<modulo>/sheets/<servicio>.service.js`.
9. Verificar con `yarn lint` (o `yarn check`).

## Convenciones transversales

- **ESM siempre**: `import`/`export`, `"type": "module"`.
- Exports **nombrados**; evitar `default` salvo en `app.js`.
- **Sin comentarios** en el código salvo que se pidan explícitamente.
- Los imports entre archivos usan rutas relativas **con extensión `.js`**.
- Consistencia de nombres: carpeta `camelCase`, recurso HTTP `kebab-case`,
  archivo `<nombre>.controller|service|routes.js`.
- Mensajes de error en el `service`; el `controller` decide el status.

## Gotchas

- Verifica mayúsculas/minúsculas en los imports de rutas
  (`config/token.js` vs `config/Token.js`): en Windows no falla, en
  Linux/Vercel sí.
- Mantén coherente el puerto entre `config/swagger.js` (servers) y `PORT`.
- Si desplegas en Vercel, `vercel.json` redirige todo a `index.js`
  (`routes: [{ "src": "/(.*)", "dest": "/" }]`).
- `verifyRole` puede re-verificar el token aunque `verifyToken` ya corrió; si
  sigues esa convención, documenta que es intencional.
- No mezcles acceso a `process.env` fuera de `config/`.
- Un módulo nuevo **no** debe importar controladores/services de otro módulo;
  comparte mediante `libs/`, `models/` o `utils/`.
