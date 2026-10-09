import mongoose from "mongoose";
import { TURNOS } from "../utils/tiempo.js";

const jornadaSchema = new mongoose.Schema(
  {
    fecha: {
      type: String,
      required: [true, "fecha is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "fecha must be YYYY-MM-DD"]
    },
    turno: { type: String, required: true, enum: TURNOS },
    clave: { type: String, required: true },
    inicio: { type: Date, required: true },
    fin: { type: Date, required: true },
    activa: { type: Boolean, default: true }
  },
  { timestamps: true }
);

jornadaSchema.index({ fecha: 1, turno: 1 }, { unique: true });
jornadaSchema.index({ clave: 1 }, { unique: true });

export const Jornada = mongoose.model("Jornada", jornadaSchema);
