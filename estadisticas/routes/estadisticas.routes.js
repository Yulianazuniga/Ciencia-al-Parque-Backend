import { Router } from "express";
import * as controller from "../controllers/estadisticas.controller.js";
import { verifyToken } from "../../shared/middlewares/verifyToken.js";

const router = Router();

/**
 * @openapi
 * /api/estadisticas:
 *   get:
 *     tags: [Estadisticas]
 *     summary: Foto actual de las estadísticas (carga inicial)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Snapshot de estadísticas }
 */
router.get("/", verifyToken, controller.getSnapshot);

export default router;
