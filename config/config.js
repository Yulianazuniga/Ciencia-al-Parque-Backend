import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || "development";

export const TIMEZONE = "America/Bogota";
export const HORA_CORTE_MANANA = 12;

export const EVENTO_FECHA_DIA1 = process.env.EVENTO_FECHA_DIA1 || "2026-10-15";
export const EVENTO_FECHA_DIA2 = process.env.EVENTO_FECHA_DIA2 || "2026-10-16";
