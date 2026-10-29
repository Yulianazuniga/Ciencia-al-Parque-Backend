import { Router } from "express";
import * as controller from "../controllers/asistencias.controller.js";
import { validate } from "../../shared/middlewares/validateZod.js";
import { verifyToken } from "../../shared/middlewares/verifyToken.js";
import { verifyRole } from "../../shared/middlewares/verifyRole.js";
import { asistenciaLimiter, staffClaveLimiter } from "../../shared/middlewares/rateLimit.js";
import { ADMIN_ROLE } from "../../config/token.js";
import {
  createAsistenciaSchema,
  listQuerySchema,
  staffClaveSchema,
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
 * /api/asistencias/staff/validar:
 *   post:
 *     tags: [Asistencias]
 *     summary: Valida la contraseña para registrarse como Staff
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, example: "clave-staff" }
 *     responses:
 *       200: { description: "{ valido: true }" }
 *       403: { description: Contraseña de staff incorrecta }
 *       429: { description: Demasiados intentos }
 */
router.post(
  "/staff/validar",
  staffClaveLimiter,
  validate(staffClaveSchema),
  controller.verificarClaveStaff
);

/**
 * @openapi
 * /api/asistencias:
 *   post:
 *     tags: [Asistencias]
 *     summary: Registra la asistencia (flujo de dos caminos)
 *     description: >
 *       Si el documento existe, clona sus datos. Si no existe y faltan datos,
 *       responde 422 con code REQUIERE_REGISTRO_COMPLETO.
 *       Si procedenciaTipo es "Otro", procedenciaDetalle es obligatorio.
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
 *               genero:
 *                 type: string
 *                 enum: [Masculino, Femenino, No binario, Otro, Prefiero no decirlo]
 *               telefono: { type: string, example: "3001234567" }
 *               procedenciaTipo:
 *                 type: string
 *                 enum: [Institución, Colegio, Universidad, Ciudadano, Otro]
 *               procedenciaDetalle:
 *                 type: string
 *                 description: Obligatorio (mín. 3 caracteres) cuando procedenciaTipo es "Otro"
 *               lugarEvento:
 *                 type: string
 *                 enum: [Timbío, Santander de Quilichao, Popayán]
 *               calificacion: { type: integer, minimum: 1, maximum: 5 }
 *               destacado: { type: string, maxLength: 500 }
 *               aceptaTratamientoDatos: { type: boolean }
 *     responses:
 *       201: { description: Asistencia registrada }
 *       409: { description: Ya existe asistencia en esa jornada }
 *       422:
 *         description: >
 *           Requiere registro completo (code REQUIERE_REGISTRO_COMPLETO) o
 *           falta procedenciaDetalle al elegir "Otro" (code PROCEDENCIA_DETALLE_REQUERIDO)
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
