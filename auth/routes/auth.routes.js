import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { validate } from "../../shared/middlewares/validateZod.js";
import { verifyToken } from "../../shared/middlewares/verifyToken.js";
import { verifyRole } from "../../shared/middlewares/verifyRole.js";
import { loginLimiter } from "../../shared/middlewares/rateLimit.js";
import { ADMIN_ROLE } from "../../config/token.js";
import { registerSchema, loginSchema, refreshSchema } from "../services/auth.service.js";

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión y devuelve access + refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Tokens y usuario }
 *       401: { description: Credenciales inválidas }
 */
router.post("/login", loginLimiter, validate(loginSchema), controller.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renueva el access token (rotación de refresh token)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Nuevos tokens }
 *       401: { description: Refresh token inválido }
 */
router.post("/refresh", validate(refreshSchema), controller.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Invalida el refresh token actual
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sesión cerrada }
 */
router.post("/logout", verifyToken, controller.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Datos del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario }
 *       401: { description: No autenticado }
 */
router.get("/me", verifyToken, controller.me);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Crea un usuario (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               rol: { type: string, enum: [ADMIN, PRESENTADOR] }
 *               activo: { type: boolean }
 *     responses:
 *       201: { description: Usuario creado }
 *       403: { description: Requiere rol ADMIN }
 *       409: { description: Email ya existe }
 */
router.post(
  "/register",
  verifyToken,
  verifyRole([ADMIN_ROLE]),
  validate(registerSchema),
  controller.register
);

export default router;
