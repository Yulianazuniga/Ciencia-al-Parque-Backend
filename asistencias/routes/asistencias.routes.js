import { Router } from "express";
import * as controller from "../controllers/asistencias.controller.js";
import { validate } from "../../shared/middlewares/validateZod.js";
import { verifyToken } from "../../shared/middlewares/verifyToken.js";
import { verifyRole } from "../../shared/middlewares/verifyRole.js";
import { asistenciaLimiter } from "../../shared/middlewares/rateLimit.js";
import { ADMIN_ROLE } from "../../config/token.js";
import {
  createAsistenciaSchema,
  listQuerySchema,
  verificarSchema
} from "../services/asistencias.service.js";

const router = Router();

/**
 * @openapi
 * /api/asistencias/verificar:
 *   post:
 *     tags: [Asistencias]
 *     summary: Verifica si el documento existe y si ya asistió a la jornada actual
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documento]
 *             properties:
 *               documento: { type: string, example: "1234567890" }
 *     responses:
 *       200: { description: "{ existe, yaAsistioEnJornadaActual }" }
 */
router.post("/verificar", asistenciaLimiter, validate(verificarSchema), controller.verificar);

/**
 * @openapi
 * /api/asistencias:
 *   post:
 *     tags: [Asistencias]
 *     summary: Registra la asistencia (flujo de dos caminos)
 *     description: >
 *       Si el documento existe, clona sus datos. Si no existe y faltan datos,
 *       responde 422 con code REQUIERE_REGISTRO_COMPLETO.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documento]
 *             properties:
 *               documento: { type: string }
 *               nombreCompleto: { type: string }
 *               edad: { type: integer }
 *               genero: { type: string }
 *               telefono: { type: string }
 *               procedencia: { type: string }
 *               lugarEvento: { type: string }
 *               calificacion: { type: integer }
 *               destacado: { type: string }
 *               aceptaTratamientoDatos: { type: boolean }
 *     responses:
 *       201: { description: Asistencia registrada }
 *       409: { description: Ya existe asistencia en esa jornada }
 *       422: { description: Requiere registro completo }
 */
router.post(
  "/",
  asistenciaLimiter,
  validate(createAsistenciaSchema, { status: 422 }),
  controller.registrar
);

/**
 * @openapi
 * /api/asistencias:
 *   get:
 *     tags: [Asistencias]
 *     summary: Listado de asistencias para exportar (JSON o CSV)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: jornada
 *         schema: { type: string }
 *       - in: query
 *         name: formato
 *         schema: { type: string, enum: [json, csv] }
 *     responses:
 *       200: { description: Listado o archivo CSV }
 *       403: { description: Requiere rol ADMIN }
 */
router.get(
  "/",
  verifyToken,
  verifyRole([ADMIN_ROLE]),
  validate(listQuerySchema, { source: "query" }),
  controller.getAll
);

export default router;
