import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { z } from "zod";
import { Usuario, ROLES } from "../../models/Usuario.js";
import { RefreshToken } from "../../models/RefreshToken.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../../libs/jwt.js";
import { sha256Hex } from "../../utils/hash.js";

const SALT_ROUNDS = 10;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const toPublicUser = (usuario) => ({
  id: usuario._id,
  email: usuario.email,
  rol: usuario.rol,
  activo: usuario.activo
});

const issueTokens = async (usuario) => {
  const jti = crypto.randomUUID();
  const payload = { id: usuario._id.toString(), email: usuario.email, rol: usuario.rol, jti };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const decoded = jwt.decode(refreshToken);

  await RefreshToken.create({
    tokenHash: sha256Hex(refreshToken),
    usuarioId: usuario._id,
    expiresAt: new Date(decoded.exp * 1000)
  });

  return { accessToken, refreshToken, user: toPublicUser(usuario) };
};

export const register = async (data) => {
  const existe = await Usuario.findOne({ email: data.email.toLowerCase() });
  if (existe) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const usuario = await Usuario.create({
    email: data.email,
    passwordHash,
    rol: data.rol,
    activo: data.activo ?? true
  });

  return toPublicUser(usuario);
};

export const login = async (email, password) => {
  const usuario = await Usuario.findOne({ email: email.toLowerCase() });
  if (!usuario) throw new Error("INVALID_CREDENTIALS");
  if (!usuario.activo) throw new Error("USER_INACTIVE");

  const coincide = await bcrypt.compare(password, usuario.passwordHash);
  if (!coincide) throw new Error("INVALID_CREDENTIALS");

  return issueTokens(usuario);
};

export const refresh = async (token) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const stored = await RefreshToken.findOne({ tokenHash: sha256Hex(token) });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const usuario = await Usuario.findById(decoded.id);
  if (!usuario || !usuario.activo) throw new Error("INVALID_REFRESH_TOKEN");

  stored.revokedAt = new Date();
  await stored.save();

  return issueTokens(usuario);
};

export const logout = async (token) => {
  if (!token) throw new Error("Refresh token is required");
  await RefreshToken.updateOne(
    { tokenHash: sha256Hex(token) },
    { revokedAt: new Date() }
  );
  return { message: "Sesión cerrada" };
};

export const me = async (id) => {
  const usuario = await Usuario.findById(id);
  if (!usuario) throw new Error("Usuario not found");
  return toPublicUser(usuario);
};
