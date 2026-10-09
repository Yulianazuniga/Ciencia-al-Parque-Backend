import rateLimit from "express-rate-limit";

const buildLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message }
  });

export const asistenciaLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: "Demasiadas solicitudes de asistencia, intenta de nuevo en un minuto"
});

export const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Demasiados intentos de inicio de sesión, intenta más tarde"
});
