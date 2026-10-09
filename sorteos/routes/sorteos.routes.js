import { Router } from "express";
import * as controller from "../controllers/sorteos.controller.js";
import { validate } from "../../shared/middlewares/validateZod.js";
import { verifyToken } from "../../shared/middlewares/verifyToken.js";
import { verifyRole } from "../../shared/middlewares/verifyRole.js";
import { ADMIN_ROLE } from "../../config/token.js";
import { createSorteoSchema } from "../services/sorteos.service.js";

const router = Router();

/**
 * @openapi
 * /api/sorteos:
 *   post:
 *     tags: [Sorteos]
 *     summary: Realiza un sorteo sobre las jornadas seleccionadas (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jornadaIds, premio]
 *             properties:
 *               jornadaIds:
 *                 type: array
 *                 items: { type: string }
 *               premio: { type: string, example: "Tablet" }
 *     responses:
 *       201: { description: Ganador y total de elegibles }
 *       400: { description: Alguna jornada no tiene registros }
 *       404: { description: Alguna jornada no existe }
 *       409: { description: No hay elegibles }
 */
router.post(
  "/",
  verifyToken,
  verifyRole([ADMIN_ROLE]),
  validate(createSorteoSchema),
  controller.realizar
);

/**
 * @openapi
 * /api/sorteos:
 *   get:
 *     tags: [Sorteos]
 *     summary: Historial de ganadores
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Listado de sorteos }
 */
router.get("/", verifyToken, controller.getAll);

export default router;
