import mongoose from "mongoose";

const sorteoSchema = new mongoose.Schema(
  {
    numeroSorteo: { type: Number, required: true },
    premio: { type: String, required: true, trim: true },
    jornadasParticipantes: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Jornada", required: true }
    ],
    totalElegibles: { type: Number, required: true },
    ganadorDocumento: { type: String, required: true, unique: true },
    ganadorDatos: { type: mongoose.Schema.Types.Mixed, required: true },
    realizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }
  },
  { timestamps: true }
);

export const Sorteo = mongoose.model("Sorteo", sorteoSchema);
