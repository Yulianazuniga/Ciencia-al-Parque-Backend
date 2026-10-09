import { z } from "zod";
import mongoose from "mongoose";
import { Sorteo } from "../../models/Sorteo.js";
import { Asistencia } from "../../models/Asistencia.js";
import { Jornada } from "../../models/Jornada.js";
import { appEvents, EVENTOS } from "../../libs/events.js";
import { getConteos } from "../../jornadas/services/jornadas.service.js";

const MAX_REINTENTOS = 5;

export const createSorteoSchema = z.object({
  jornadaIds: z.array(z.string().min(1)).min(1, "jornadaIds no puede estar vacío"),
  premio: z.string().min(1).max(200)
});

const obtenerElegibles = async (jornadaIds, ganadores) => {
  const [resultado] = await Asistencia.aggregate([
    {
      $match: {
        jornadaId: { $in: jornadaIds },
        documento: { $nin: ganadores }
      }
    },
    { $group: { _id: "$documento" } },
    { $count: "total" }
  ]);
  return resultado?.total || 0;
};

const sortearGanador = async (jornadaIds, ganadores) => {
  const [elegido] = await Asistencia.aggregate([
    {
      $match: {
        jornadaId: { $in: jornadaIds },
        documento: { $nin: ganadores }
      }
    },
    {
      $group: {
        _id: "$documento",
        asistenciaId: { $first: "$_id" },
        datos: { $first: "$datos" }
      }
    },
    { $sample: { size: 1 } }
  ]);
  return elegido;
};

export const realizar = async ({ jornadaIds, premio }, usuarioId) => {
  const ids = jornadaIds.map((id) => new mongoose.Types.ObjectId(id));

  const jornadas = await Jornada.find({ _id: { $in: ids } });
  if (jornadas.length !== ids.length) throw new Error("JORNADA_NOT_FOUND");

  const conteos = await getConteos();
  const sinRegistros = jornadas.filter((jornada) => !conteos.get(jornada._id.toString()));
  if (sinRegistros.length > 0) throw new Error("JORNADA_SIN_REGISTROS");

  const ganadores = await Sorteo.distinct("ganadorDocumento");
  const totalElegibles = await obtenerElegibles(ids, ganadores);
  if (totalElegibles === 0) throw new Error("NO_ELEGIBLES");

  const numeroSorteo = (await Sorteo.countDocuments()) + 1;

  for (let intento = 0; intento < MAX_REINTENTOS; intento += 1) {
    const ganadoresActuales = await Sorteo.distinct("ganadorDocumento");
    const elegido = await sortearGanador(ids, ganadoresActuales);
    if (!elegido) throw new Error("NO_ELEGIBLES");

    try {
      const sorteo = await Sorteo.create({
        numeroSorteo,
        premio,
        jornadasParticipantes: ids,
        totalElegibles,
        ganadorDocumento: elegido._id,
        ganadorDatos: elegido.datos,
        realizadoPor: usuarioId
      });

      const resultado = {
        id: sorteo._id,
        numeroSorteo,
        premio,
        jornadas: jornadas.map((jornada) => ({
          id: jornada._id,
          fecha: jornada.fecha,
          turno: jornada.turno,
          clave: jornada.clave
        })),
        totalElegibles,
        ganador: { documento: elegido._id, datos: elegido.datos },
        createdAt: sorteo.createdAt
      };

      appEvents.emit(EVENTOS.SORTEO_REALIZADO, resultado);
      return resultado;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  throw new Error("SORTEO_CONFLICTO");
};

export const getAll = async () =>
  Sorteo.find()
    .sort({ createdAt: -1 })
    .populate("realizadoPor", "email rol")
    .lean();
