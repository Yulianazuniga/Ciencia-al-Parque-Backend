import mongoose from "mongoose";
import { ADMIN_ROLE, PRESENTADOR_ROLE } from "../config/token.js";

export const ROLES = [ADMIN_ROLE, PRESENTADOR_ROLE];

const usuarioSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: [true, "passwordHash is required"] },
    rol: { type: String, enum: ROLES, default: PRESENTADOR_ROLE },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Usuario = mongoose.model("Usuario", usuarioSchema);
