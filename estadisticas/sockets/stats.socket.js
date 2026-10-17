import { verifyAccessToken } from "../../libs/jwt.js";
import { appEvents, EVENTOS } from "../../libs/events.js";
import { getSnapshot } from "../services/estadisticas.service.js";

const DEBOUNCE_MS = 250;

let namespace = null;
let timer = null;

const emitirActualizacion = async () => {
  try {
    namespace?.emit("stats:update", await getSnapshot());
  } catch (error) {
    console.error("stats:update error:", error.message);
  }
};

const programarActualizacion = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    emitirActualizacion();
  }, DEBOUNCE_MS);
};

export const registerStatsSocket = (io) => {
  namespace = io.of("/stats");

  namespace.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    try {
      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  namespace.on("connection", async (socket) => {
    try {
      socket.emit("stats:snapshot", await getSnapshot());
    } catch (error) {
      console.error("stats:snapshot error:", error.message);
    }
  });

  appEvents.on(EVENTOS.ASISTENCIA_REGISTRADA, programarActualizacion);
  appEvents.on(EVENTOS.SORTEO_REALIZADO, (resultado) =>
    namespace?.emit("sorteo:ganador", resultado)
  );

  return namespace;
};
