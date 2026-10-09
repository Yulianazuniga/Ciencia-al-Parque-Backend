import { z } from "zod";
import { Jornada } from "../../models/Jornada.js";
import { Asistencia } from "../../models/Asistencia.js";
import { claveJornada, rangoJornada, jornadaVigente } from "../../utils/tiempo.js";

export const listQuerySchema = z.object({
  conRegistros: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});

export const obtenerOCrearJornada = async ({ fecha, turno }) => {
  const clave = claveJornada(fecha, turno);
  const { inicio, fin } = rangoJornada(fecha, turno);

  return Jornada.findOneAndUpdate(
    { fecha, turno },
    { $setOnInsert: { clave, inicio, fin, activa: true } },
    { new: true, upsert: true }
  );
};

export const getActual = async () => {
  const vigente = jornadaVigente();
  const jornada = await Jornada.findOne({ fecha: vigente.fecha, turno: vigente.turno });
  if (!jornada) return { ...vigente, existe: false, totalAsistentes: 0 };

  const totalAsistentes = await Asistencia.countDocuments({ jornadaId: jornada._id });
  return {
    id: jornada._id,
    fecha: jornada.fecha,
    turno: jornada.turno,
    clave: jornada.clave,
    inicio: jornada.inicio,
    fin: jornada.fin,
    existe: true,
    totalAsistentes
  };
};

export const getConteos = async () => {
  const resultados = await Asistencia.aggregate([
    { $group: { _id: "$jornadaId", total: { $sum: 1 } } }
  ]);
  return new Map(resultados.map((item) => [item._id.toString(), item.total]));
};

export const getAll = async ({ conRegistros = false } = {}) => {
  const jornadas = await Jornada.find().sort({ fecha: 1, turno: 1 }).lean();

  if (!conRegistros) {
    return jornadas.map((jornada) => ({
      id: jornada._id,
      fecha: jornada.fecha,
      turno: jornada.turno,
      clave: jornada.clave,
      inicio: jornada.inicio,
      fin: jornada.fin,
      activa: jornada.activa
    }));
  }

  const conteos = await getConteos();
  return jornadas
    .map((jornada) => ({
      id: jornada._id,
      fecha: jornada.fecha,
      turno: jornada.turno,
      clave: jornada.clave,
      totalAsistentes: conteos.get(jornada._id.toString()) || 0
    }))
    .filter((jornada) => jornada.totalAsistentes > 0);
};

export const getByIds = async (ids) => Jornada.find({ _id: { $in: ids } });
