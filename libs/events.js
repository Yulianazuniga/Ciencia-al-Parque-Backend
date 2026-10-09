import { EventEmitter } from "node:events";

export const appEvents = new EventEmitter();

export const EVENTOS = {
  ASISTENCIA_REGISTRADA: "asistencia:registrada",
  SORTEO_REALIZADO: "sorteo:realizado"
};
