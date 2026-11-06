import { Asistencia } from "../../models/Asistencia.js";
import { TIMEZONE } from "../../config/config.js";
import { claveJornada, jornadaVigente } from "../../utils/tiempo.js";

const HORAS_ULTIMA_VENTANA = 6;

const ES_PUBLICO = { "datos.rol": { $ne: "Staff" } };
const ES_STAFF = { "datos.rol": "Staff" };

const contar = (facet) => facet?.[0]?.n || 0;

const agregarPublico = async (desde) => {
  const [data] = await Asistencia.aggregate([
    { $match: ES_PUBLICO },
    {
      $facet: {
        total: [{ $count: "n" }],
        unicos: [{ $group: { _id: "$documento" } }, { $count: "n" }],
        primeraVez: [{ $match: { primeraVez: true } }, { $count: "n" }],
        porJornada: [
          {
            $group: {
              _id: { fecha: "$fecha", turno: "$turno" },
              total: { $sum: 1 },
              primeraVez: { $sum: { $cond: ["$primeraVez", 1, 0] } }
            }
          }
        ],
        porLugar: [
          { $match: { "datos.lugarEvento": { $type: "string", $ne: "" } } },
          {
            $group: {
              _id: "$datos.lugarEvento",
              total: { $sum: 1 }
            }
          },
          { $sort: { total: -1 } }
        ],
        calificacion: [
          {
            $match: {
              "datos.calificacion": {
                $gte: 1,
                $lte: 5
              }
            }
          },
          {
            $group: {
              _id: null,
              promedio: { $avg: "$datos.calificacion" },
              votos: { $sum: 1 }
            }
          }
        ],
        porMunicipio: [
          { $match: { "datos.municipio": { $type: "string", $ne: "" } } },
          {
            $group: {
              _id: "$datos.municipio",
              total: { $sum: 1 }
            }
          },
          { $sort: { total: -1 } }
        ],
        porDia: [
          { $group: { _id: "$fecha", total: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        porEdad: [
          { $match: { "datos.edad": { $type: "number" } } },
          { $sort: { createdAt: 1 } },
          { $group: { _id: "$documento", edad: { $first: "$datos.edad" } } },
          { $group: { _id: "$edad", total: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        porGenero: [
          { $match: { "datos.genero": { $type: "string", $ne: "" } } },
          { $sort: { createdAt: 1 } },
          { $group: { _id: "$documento", genero: { $first: "$datos.genero" } } },
          { $group: { _id: "$genero", total: { $sum: 1 } } },
          { $sort: { total: -1 } }
        ],
        ultimaHora: [
          { $match: { createdAt: { $gte: desde } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  date: "$createdAt",
                  format: "%H:00",
                  timezone: TIMEZONE
                }
              },
              total: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);

  return data || {};
};

const agregarStaff = async () => {
  const [data] = await Asistencia.aggregate([
    { $match: ES_STAFF },
    {
      $facet: {
        total: [{ $count: "n" }],
        unicos: [{ $group: { _id: "$documento" } }, { $count: "n" }],
        porJornada: [
          {
            $group: {
              _id: { fecha: "$fecha", turno: "$turno" },
              total: { $sum: 1 }
            }
          }
        ],
        porDia: [
          { $group: { _id: "$fecha", total: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        porParticipacion: [
          { $match: { "datos.tipoStaff": { $type: "string", $ne: "" } } },
          {
            $group: {
              _id: "$datos.tipoStaff",
              total: { $sum: 1 }
            }
          },
          { $sort: { total: -1 } }
        ]
      }
    }
  ]);

  return data || {};
};

const participacionStaffDesde = (porParticipacion) => ({
  conferencista: porParticipacion?.find((x) => x._id === "Conferencista")?.total || 0,
  ponenteAgendaAcademica:
    porParticipacion?.find((x) => x._id === "Ponente agenda académica")?.total || 0,
  expositorMuestras:
    porParticipacion?.find((x) => x._id === "Expositor muestras interactivas")?.total || 0,
  expositorColegios:
    porParticipacion?.find((x) => x._id === "Expositor Colegios")?.total || 0,
  organizacion: porParticipacion?.find((x) => x._id === "Organización")?.total || 0,
  mentor: porParticipacion?.find((x) => x._id === "Mentor")?.total || 0,
  evaluador: porParticipacion?.find((x) => x._id === "Evaluador")?.total || 0
});

const mapPorParticipacion = (porParticipacion) =>
  (porParticipacion || []).map((item) => ({
    tipo: item._id,
    total: item.total
  }));

export const getSnapshot = async () => {
  const desde = new Date(Date.now() - HORAS_ULTIMA_VENTANA * 60 * 60 * 1000);

  const [data, staffData] = await Promise.all([agregarPublico(desde), agregarStaff()]);

  const porJornada = (data.porJornada || []).map((item) => ({
    clave: claveJornada(item._id.fecha, item._id.turno),
    fecha: item._id.fecha,
    turno: item._id.turno,
    total: item.total,
    primeraVez: item.primeraVez,
    recurrentes: item.total - item.primeraVez
  }));

  const porJornadaStaff = (staffData.porJornada || []).map((item) => ({
    clave: claveJornada(item._id.fecha, item._id.turno),
    fecha: item._id.fecha,
    turno: item._id.turno,
    total: item.total
  }));

  const vigente = jornadaVigente();
  const claveActual = vigente.clave;
  const jornadaActual =
    porJornada.find((item) => item.clave === claveActual) || {
      clave: claveActual,
      fecha: vigente.fecha,
      turno: vigente.turno,
      total: 0,
      primeraVez: 0,
      recurrentes: 0
    };

  const porParticipacion = mapPorParticipacion(staffData.porParticipacion);
  const participacionStaff = participacionStaffDesde(staffData.porParticipacion);

  const totalAsistencias = contar(data.total);
  const totalPrimeraVez = contar(data.primeraVez);
  const calificacion = data.calificacion?.[0];

  return {
    jornadaActual,
    porJornada: porJornada.map(({ clave, total }) => ({ clave, total })),
    porDia: (data.porDia || []).map((item) => ({ fecha: item._id, total: item.total })),
    porEdad: (data.porEdad || []).map((item) => ({
      edad: item._id,
      total: item.total
    })),
    porGenero: (data.porGenero || []).map((item) => ({
      genero: item._id,
      total: item.total
    })),
    porLugar: (data.porLugar || []).map((item) => ({
      lugar: item._id,
      total: item.total
    })),
    porMunicipio: (data.porMunicipio || []).map((item) => ({
      municipio: item._id,
      total: item.total
    })),
    porParticipacion,
    participacionStaff,
    asistentesUnicos: contar(data.unicos),
    totalAsistencias,
    nuevos: totalPrimeraVez,
    recurrentes: totalAsistencias - totalPrimeraVez,
    calificacionPromedio: calificacion
      ? Math.round(calificacion.promedio * 10) / 10
      : 0,
    calificacionVotos: calificacion ? calificacion.votos : 0,
    ultimaHora: (data.ultimaHora || []).map((item) => ({ hora: item._id, total: item.total })),
    staff: {
      asistentesUnicos: contar(staffData.unicos),
      totalAsistencias: contar(staffData.total),
      porDia: (staffData.porDia || []).map((item) => ({
        fecha: item._id,
        total: item.total
      })),
      porJornada: porJornadaStaff.map(({ clave, fecha, turno, total }) => ({
        clave,
        fecha,
        turno,
        total
      })),
      porParticipacion
    },
    actualizadoEn: new Date().toISOString()
  };
};
