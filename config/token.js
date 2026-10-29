import dotenv from "dotenv";
dotenv.config();

export const TOKEN_SECRET = process.env.TOKEN_SECRET;
export const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || TOKEN_SECRET;
export const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "7d";

export const ADMIN_ROLE = process.env.ADMIN_ROLE || "ADMIN";
export const PRESENTADOR_ROLE = process.env.PRESENTADOR_ROLE || "PRESENTADOR";

export const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

export const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@evento.local";
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Cambiar123*";

export const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL;
export const FRONTEND_STG_URL = process.env.FRONTEND_STG_URL;
export const FRONTEND_PROD_URL = process.env.FRONTEND_PROD_URL;
