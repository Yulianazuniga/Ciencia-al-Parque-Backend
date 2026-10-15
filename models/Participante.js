import mongoose from "mongoose";

export const GENEROS = [
  "Masculino",
  "Femenino",
  "No binario",
  "Otro",
  "Prefiero no decirlo"
];

export const LUGARES_EVENTO = ["Timbío", "Santander de Quilichao", "Popayán"];

export const OPCIONES_PROCEDENCIA = ["Institución", "Colegio", "Universidad","Ciudadano", "Otro"];

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
    procedenciaTipo: {
      type: String,
      required: true,
      enum: OPCIONES_PROCEDENCIA
    },
    procedenciaDetalle: {
      type: String,
      maxlength: 200,
      trim: true,
      validate: {
        validator: function (value) {
          // Solo obligatorio si procedenciaTipo es "Otro"
          if (this.procedenciaTipo === "Otro") {
            return value && value.length > 0;
          }
          return true;
        },
        message: "Debe especificar procedencia si selecciona 'Otro'"
      }
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
