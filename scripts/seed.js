import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../database/database.js";
import { Usuario } from "../models/Usuario.js";
import { Jornada } from "../models/Jornada.js";
import { ADMIN_ROLE, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from "../config/token.js";
import { EVENTO_FECHA_DIA1, EVENTO_FECHA_DIA2 } from "../config/config.js";
import { claveJornada, rangoJornada } from "../utils/tiempo.js";

const seedAdmin = async () => {
  const email = SEED_ADMIN_EMAIL.toLowerCase();
  let admin = await Usuario.findOne({ email });

  if (!admin) {
    const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
    admin = await Usuario.create({ email, passwordHash, rol: ADMIN_ROLE, activo: true });
    console.log(`Admin creado: ${email}`);
  } else {
    admin.rol = ADMIN_ROLE;
    admin.activo = true;
    await admin.save();
    console.log(`Admin existente actualizado: ${email}`);
  }
};

const seedJornadas = async (fechas) => {
  for (const fecha of fechas) {
    for (const turno of ["MANANA", "TARDE"]) {
      const { inicio, fin } = rangoJornada(fecha, turno);
      await Jornada.findOneAndUpdate(
        { fecha, turno },
        { $setOnInsert: { clave: claveJornada(fecha, turno), inicio, fin, activa: true } },
        { upsert: true }
      );
      console.log(`Jornada asegurada: ${claveJornada(fecha, turno)}`);
    }
  }
};

const run = async () => {
  await connectDB();
  await seedAdmin();
  await seedJornadas([EVENTO_FECHA_DIA1, EVENTO_FECHA_DIA2].filter(Boolean));
  await mongoose.disconnect();
  console.log("Seed completado");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
