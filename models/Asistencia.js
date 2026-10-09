import mongoose from "mongoose";
import { TURNOS } from "../utils/tiempo.js";

const asistenciaSchema = new mongoose.Schema(
  {
    participanteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participante",
      required: true
    },
    documento: { type: String, required: true },
    jornadaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Jornada",
      required: true
    },
    fecha: { type: String, required: true },
    turno: { type: String, required: true, enum: TURNOS },
    datos: { type: mongoose.Schema.Types.Mixed, required: true },
    primeraVez: { type: Boolean, default: true }
  },
  { timestamps: true }
);

asistenciaSchema.index({ documento: 1, fecha: 1, turno: 1 }, { unique: true });
asistenciaSchema.index({ jornadaId: 1 });
asistenciaSchema.index({ fecha: 1 });
asistenciaSchema.index({ createdAt: 1 });

export const Asistencia = mongoose.model("Asistencia", asistenciaSchema);
