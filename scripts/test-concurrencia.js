import mongoose from "mongoose";
import { connectDB } from "../database/database.js";
import { Participante } from "../models/Participante.js";
import { Asistencia } from "../models/Asistencia.js";
import { registrar } from "../asistencias/services/asistencias.service.js";

const DOCUMENTO_NUEVO = "900000001";
const DOCUMENTO_EXISTENTE = "900000002";

const limpiar = async () => {
  await Participante.deleteMany({ documento: { $in: [DOCUMENTO_NUEVO, DOCUMENTO_EXISTENTE] } });
  await Asistencia.deleteMany({ documento: { $in: [DOCUMENTO_NUEVO, DOCUMENTO_EXISTENTE] } });
};

const datosCompletos = (documento) => ({
  documento,
  nombreCompleto: "Prueba Concurrencia",
  edad: 20,
  genero: "Prefiero no decirlo",
  telefono: "3216549870",
  procedencia: "Prueba técnica",
  lugarEvento: "Popayán",
  calificacion: 3,
  destacado: "",
  aceptaTratamientoDatos: true
});

const main = async () => {
  await connectDB();

  await limpiar();

  const resultados = await Promise.allSettled(
    Array.from({ length: 8 }, () => registrar(datosCompletos(DOCUMENTO_NUEVO)))
  );
  const exitosos = resultados.filter((r) => r.status === "fulfilled").length;
  const duplicados = resultados.filter(
    (r) => r.status === "rejected" && r.reason?.message === "DUPLICADO"
  ).length;

  console.log("Concurrencia (documento nuevo, 8 peticiones simultáneas):");
  console.log(`  exitosos: ${exitosos} (esperado 1)`);
  console.log(`  duplicados: ${duplicados} (esperado 7)`);
  const asistenciasNuevo = await Asistencia.countDocuments({ documento: DOCUMENTO_NUEVO });
  console.log(`  registros en BD: ${asistenciasNuevo} (esperado 1)`);

  await Participante.create(datosCompletos(DOCUMENTO_EXISTENTE));
  const concurrentes = await Promise.allSettled(
    Array.from({ length: 6 }, () => registrar({ documento: DOCUMENTO_EXISTENTE }))
  );
  const exitososClon = concurrentes.filter((r) => r.status === "fulfilled").length;
  console.log("Concurrencia (documento existente, 6 peticiones simultáneas):");
  console.log(`  exitosos: ${exitososClon} (esperado 1, con primeraVez false)`);
  const asistenciasClon = await Asistencia.find({ documento: DOCUMENTO_EXISTENTE });
  console.log(`  registros en BD: ${asistenciasClon.length} (esperado 1)`);
  if (asistenciasClon[0]) {
    console.log(`  primeraVez del registro: ${asistenciasClon[0].primeraVez} (esperado false)`);
    console.log(`  datos clonados nombreCompleto: ${asistenciasClon[0].datos.nombreCompleto}`);
  }

  await limpiar();
  await mongoose.disconnect();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});