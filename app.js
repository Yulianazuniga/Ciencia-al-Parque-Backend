import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import {
  FRONTEND_DEV_URL,
  FRONTEND_STG_URL,
  FRONTEND_PROD_URL
} from "./config/token.js";
import authRouter from "./auth/routes/auth.routes.js";
import jornadasRouter from "./jornadas/routes/jornadas.routes.js";
import asistenciasRouter from "./asistencias/routes/asistencias.routes.js";
import sorteosRouter from "./sorteos/routes/sorteos.routes.js";
import estadisticasRouter from "./estadisticas/routes/estadisticas.routes.js";
import { notFound, errorHandler } from "./shared/middlewares/errorHandler.js";

const app = express();

const origenes = [FRONTEND_DEV_URL, FRONTEND_STG_URL, FRONTEND_PROD_URL].filter(Boolean);

app.use(helmet());
app.use(cors({ origin: origenes.length ? origenes : true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static("public"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /swagger.json:
 *   get:
 *     tags: [General]
 *     summary: Especificación OpenAPI completa en formato JSON
 *     responses:
 *       200: { description: Documento OpenAPI 3.0.3 }
 */
app.get("/swagger.json", (_req, res) => res.json(swaggerSpec));

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [General]
 *     summary: Verifica que el servicio esté en línea
 *     responses:
 *       200: { description: Servicio activo }
 */
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/jornadas", jornadasRouter);
app.use("/api/asistencias", asistenciasRouter);
app.use("/api/sorteos", sorteosRouter);
app.use("/api/estadisticas", estadisticasRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
