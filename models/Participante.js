import mongoose from "mongoose";

export const GENEROS = [
  "Masculino",
  "Femenino",
  "No binario",
  "Otro",
  "Prefiero no decirlo"
];

export const LUGARES_EVENTO = ["Timbío", "Santander de Quilichao", "Popayán"];

const participanteSchema = new mongoose.Schema(
  {
    documento: {
      type: String,
      required: [true, "documento is required"],
      unique: true,
      match: [/^\d{5,12}$/, "documento must be 5 to 12 digits"]
    },
    nombreCompleto: {
      type: String,
      required: [true, "nombreCompleto is required"],
      minlength: 3,
      maxlength: 120,
      trim: true
    },
    edad: { type: Number, required: true, min: 1, max: 120 },
    genero: { type: String, required: true, enum: GENEROS },
    telefono: {
      type: String,
      required: true,
      match: [/^3\d{9}$/, "telefono must be a 10 digit colombian cellphone"]
    },
    procedencia: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 200,
      trim: true
    },
    lugarEvento: { type: String, required: true, enum: LUGARES_EVENTO },
    calificacion: { type: Number, required: true, min: 1, max: 5 },
    destacado: { type: String, maxlength: 500, default: "" },
    aceptaTratamientoDatos: {
      type: Boolean,
      required: true,
      validate: {
        validator: (value) => value === true,
        message: "aceptaTratamientoDatos must be true"
      }
    }
  },
  { timestamps: true }
);

export const Participante = mongoose.model("Participante", participanteSchema);
