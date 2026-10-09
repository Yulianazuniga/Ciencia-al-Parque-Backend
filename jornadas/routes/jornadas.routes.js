import { Router } from "express";
import * as controller from "../controllers/jornadas.controller.js";
import { validate } from "../../shared/middlewares/validateZod.js";
import { verifyToken } from "../../shared/middlewares/verifyToken.js";
import { verifyRole } from "../../shared/middlewares/verifyRole.js";
import { ADMIN_ROLE } from "../../config/token.js";
import { listQuerySchema } from "../services/jornadas.service.js";

const router = Router();

/**
 * @openapi
 * /api/jornadas/actual:
 *   get:
 *     tags: [Jornadas]
 *     summary: Jornada vigente según la hora del servidor (America/Bogota)
 *     responses:
 *       200: { description: Jornada actual o indicador de que aún no existe }
 */
router.get("/actual", controller.getActual);

/**
 * @openapi
 * /api/jornadas:
 *   get:
 *     tags: [Jornadas]
 *     summary: Lista las jornadas; con conRegistros=true solo las que tienen asistencias
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: conRegistros
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Listado de jornadas }
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
