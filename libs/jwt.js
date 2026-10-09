import jwt from "jsonwebtoken";
import {
  TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES
} from "../config/token.js";

export const signAccessToken = (payload) =>
  jwt.sign(payload, TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });

export const verifyAccessToken = (token) => jwt.verify(token, TOKEN_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_TOKEN_SECRET);
