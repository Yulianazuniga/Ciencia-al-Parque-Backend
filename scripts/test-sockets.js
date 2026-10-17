import mongoose from "mongoose";
import { io } from "socket.io-client";
import { connectDB } from "../database/database.js";
import { Participante } from "../models/Participante.js";
import { Asistencia } from "../models/Asistencia.js";
import { Sorteo } from "../models/Sorteo.js";

const BASE = "http://localhost:4000";
const DOCUMENTO = "2223334445";
const ESPERA_UPDATE = 4000;

const login = async () => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@evento.local", password: "Cambiar123*" })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login falló: ${data.message}`);
  return data.accessToken;
};

const registrarAsistencia = async () => {
  const res = await fetch(`${BASE}/api/asistencias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documento: DOCUMENTO,
      nombreCompleto: "Prueba Socket",
      edad: 30,
      genero: "Otro",
      telefono: "3104567890",
      procedenciaTipo: "Ciudadano",
      procedenciaDetalle: "Prueba Socket",
      lugarEvento: "Popayán",
      calificacion: 2,
      aceptaTratamientoDatos: true
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`asistencia falló: ${data.message}`);
  return data.clave;
};

const main = async () => {
  await connectDB();
  await Participante.deleteMany({ documento: DOCUMENTO });
  await Asistencia.deleteMany({ documento: DOCUMENTO });
  await Sorteo.deleteMany({ ganadorDocumento: DOCUMENTO });

  const token = await login();
  const socket = io(`${BASE}/stats`, { auth: { token } });

  let snapshot = null;
  let update = null;
  let ganador = null;

  socket.on("connect", () => console.log("socket conectado"));
  socket.on("connect_error", (error) => {
    console.error("connect_error:", error.message);
    process.exit(1);
  });
  socket.on("stats:snapshot", (data) => {
    snapshot = data;
    console.log(`stats:snapshot recibido (asistentesUnicos=${data.asistentesUnicos})`);
  });

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.log("timeout snapshot");
      resolve();
    }, 3000);
    socket.on("stats:snapshot", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  const claveEsperada = await registrarAsistencia();
  console.log(`asistencia registrada vía HTTP (${claveEsperada}), esperando stats:update...`);

  socket.on("stats:update", (data) => {
    update = data;
    console.log(`stats:update recibido (totalAsistencias=${data.totalAsistencias})`);
  });
  socket.on("sorteo:ganador", (data) => {
    ganador = data;
    console.log(`sorteo:ganador recibido (documento=${data?.ganador?.documento})`);
  });

  await new Promise((resolve) => setTimeout(resolve, ESPERA_UPDATE));

  const jornadaRes = await fetch(`${BASE}/api/jornadas?conRegistros=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const jornadas = await jornadaRes.json();
  const jornadaId = jornadas[0]?.id;

  const sorteoRes = await fetch(`${BASE}/api/sorteos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jornadaIds: [jornadaId], premio: "Premio Socket" })
  });
  const sorteoData = await sorteoRes.json();
  console.log(`sorteo HTTP: ${sorteoRes.status} (${sorteoData.message || "ok"})`);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const snapOk = Boolean(snapshot);
  const updateOk = Boolean(update);
  const ganadorOk = Boolean(ganador);
  console.log("RESULTADOS:", { snapOk, updateOk, ganadorOk, estadoSorteoHTTP: sorteoRes.status });

  socket.disconnect();
  await Participante.deleteMany({ documento: DOCUMENTO });
  await Asistencia.deleteMany({ documento: DOCUMENTO });
  await Sorteo.deleteMany({ ganadorDocumento: DOCUMENTO });
  await mongoose.disconnect();

  if (!snapOk || !updateOk || ganadorOk !== true || sorteoRes.status !== 201) {
    console.error(`FALLO: snapshot=${snapOk} update=${updateOk} ganador=${ganadorOk} sorteoHTTP=${sorteoRes.status}`);
    process.exit(1);
  }
  console.log("Prueba de sockets exitosa");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});