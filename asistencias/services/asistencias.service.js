import { z } from "zod";
import { Participante, GENEROS, LUGARES_EVENTO, OPCIONES_PROCEDENCIA, ROLES_PARTICIPANTE, TIPOS_STAFF } from "../../models/Participante.js";
import { Asistencia } from "../../models/Asistencia.js";
import { appEvents, EVENTOS } from "../../libs/events.js";
import { jornadaVigente } from "../../utils/tiempo.js";
import { obtenerOCrearJornada } from "../../jornadas/services/jornadas.service.js";
import { toCsv } from "../../utils/csv.js";

export const participanteSchema = z.object({
  
  documento: z.string().regex(/^\d{5,12}$/, "documento debe tener de 5 a 12 dígitos"),
  nombreCompleto: z.string().min(3).max(120),
  edad: z.coerce.number().int().min(1).max(120),
  genero: z.enum(GENEROS),
  rol: z.enum(ROLES_PARTICIPANTE),
  tipoStaff: z.enum(TIPOS_STAFF).optional(),
  telefono: z.string().regex(/^3\d{9}$/, "telefono debe ser un celular colombiano de 10 dígitos"),
  municipio: z.string().min(2, "Debe seleccionar un municipio").max(100),
  procedenciaTipo: z.enum(OPCIONES_PROCEDENCIA),
  procedenciaDetalle: z.string().min(3).max(120),
  lugarEvento: z.enum(LUGARES_EVENTO),
  calificacion: z.coerce.number().int().min(1).max(5),
  destacado: z.string().max(500).optional().default(""),
  aceptaTratamientoDatos: z.literal(true, {
    errorMap: () => ({ message: "aceptaTratamientoDatos debe ser true" })
  })
});
  
export const verificarSchema = z.object({
  documento: participanteSchema.shape.documento
});

export const createAsistenciaSchema = participanteSchema.partial().extend({
  documento: participanteSchema.shape.documento
});


export const listQuerySchema = z.object({
  jornada: z.string().optional(),
  formato: z.enum(["json", "csv"]).optional().default("json")
});

const CAMPOS_DATOS = [
  "documento",
  "nombreCompleto",
  "edad",
  "rol",
  "tipoStaff",
  "genero",
  "telefono",
  "municipio",
  "procedenciaTipo",
  "lugarEvento",
  "calificacion",
  "destacado"
];

const CAMPOS_REQUERIDOS = [
  "nombreCompleto",
  "edad",
  "rol",
  "genero",
  "telefono",
  "municipio",
  "procedenciaTipo",
  "lugarEvento",
  "calificacion",
  "aceptaTratamientoDatos"
];

const snapshot = (origen) =>
  Object.fromEntries(CAMPOS_DATOS.map((campo) => [campo, origen[campo]]));

const esDuplicado = (error) => error?.code === 11000;

export const verificar = async (documento) => {
  const participante = await Participante.findOne({ documento });
  const { fecha, turno } = jornadaVigente();

  let yaAsistioEnJornadaActual = false;
  if (participante) {
    const asistencia = await Asistencia.exists({ documento, fecha, turno });
    yaAsistioEnJornadaActual = Boolean(asistencia);
  }

  return { existe: Boolean(participante), yaAsistioEnJornadaActual };
};

const crearAsistencia = async (participante, jornada, fecha, turno, primeraVez) => {
  try {
    return await Asistencia.create({
      participanteId: participante._id,
      documento: participante.documento,
      jornadaId: jornada._id,
      fecha,
      turno,
      datos: snapshot(participante),
      primeraVez
    });
  } catch (error) {
    if (esDuplicado(error)) throw new Error("DUPLICADO");
    throw error;
  }
};

export const registrar = async (body) => {
  const { fecha, turno, clave } = jornadaVigente();
  const jornada = await obtenerOCrearJornada({ fecha, turno });

  let participante = await Participante.findOne({ documento: body.documento });

  if (participante) {
    const asistencia = await crearAsistencia(participante, jornada, fecha, turno, false);
    appEvents.emit(EVENTOS.ASISTENCIA_REGISTRADA);
    return {
      id: asistencia._id,
      clave,
      fecha,
      turno,
      primeraVez: false,
      mensaje: "Asistencia registrada",
      participante: snapshot(participante)
    };
  }
  if (body.procedenciaTipo === "Otro" && (!body.procedenciaDetalle || body.procedenciaDetalle.trim() === "")) {
    const error = new Error("PROCEDENCIA_DETALLE_REQUERIDO");
    throw error;
  }
  if (
  body.rol === "Staff" &&
  (!body.tipoStaff || body.tipoStaff.trim() === "")
) {
  const error = new Error("TIPO_STAFF_REQUERIDO");
  throw error;
}


  const faltantes = CAMPOS_REQUERIDOS.filter(
    (campo) => body[campo] === undefined || body[campo] === null
  );
  if (faltantes.length > 0) {
    const error = new Error("REQUIERE_REGISTRO_COMPLETO");
    error.camposFaltantes = faltantes;
    throw error;
  }

  try {
    participante = await Participante.create({ ...body, destacado: body.destacado ?? "" });
  } catch (error) {
    if (!esDuplicado(error)) throw error;
    participante = await Participante.findOne({ documento: body.documento });
  }

  const asistencia = await crearAsistencia(participante, jornada, fecha, turno, true);
  appEvents.emit(EVENTOS.ASISTENCIA_REGISTRADA);

  return {
    id: asistencia._id,
    clave,
    fecha,
    turno,
    primeraVez: true,
    mensaje: "Asistencia registrada por primera vez",
    participante: snapshot(participante)
  };
};

export const getAll = async ({ jornada, formato }) => {
  const filtro = jornada ? { jornadaId: jornada } : {};
  const asistencias = await Asistencia.find(filtro).sort({ createdAt: 1 }).lean();

  if (formato === "csv") {
    return {
      formato: "csv",
      contenido: toCsv(asistencias, [
        { label: "documento", value: (row) => row.documento },
        { label: "nombreCompleto", value: (row) => row.datos?.nombreCompleto },
        { label: "edad", value: (row) => row.datos?.edad },
        { label: "rol", value: (row) => row.datos?.rol },
        { label: "tipoStaff", value: (row) => row.datos?.tipoStaff },
        { label: "genero", value: (row) => row.datos?.genero },
        { label: "telefono", value: (row) => row.datos?.telefono },
        { label: "municipio", value: (row) => row.datos?.municipio },
        { label: "procedencia", value: (row) => row.datos?.procedencia },
        { label: "lugarEvento", value: (row) => row.datos?.lugarEvento },
        { label: "calificacion", value: (row) => row.datos?.calificacion },
        { label: "destacado", value: (row) => row.datos?.destacado },
        { label: "fecha", value: (row) => row.fecha },
        { label: "turno", value: (row) => row.turno },
        { label: "primeraVez", value: (row) => row.primeraVez },
        { label: "createdAt", value: (row) => row.createdAt?.toISOString() }
      ])
    };
  }

  return asistencias;
};
