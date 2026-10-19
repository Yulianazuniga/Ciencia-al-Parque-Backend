import { Asistencia } from "../../models/Asistencia.js";
import { TIMEZONE } from "../../config/config.js";
import { claveJornada, jornadaVigente } from "../../utils/tiempo.js";

const HORAS_ULTIMA_VENTANA = 6;

const contar = (facet) => facet?.[0]?.n || 0;

export const getSnapshot = async () => {
  const desde = new Date(Date.now() - HORAS_ULTIMA_VENTANA * 60 * 60 * 1000);

  const [data] = await Asistencia.aggregate([
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

  const porJornada = (data.porJornada || []).map((item) => ({
    clave: claveJornada(item._id.fecha, item._id.turno),
    fecha: item._id.fecha,
    turno: item._id.turno,
    total: item.total,
    primeraVez: item.primeraVez,
    recurrentes: item.total - item.primeraVez
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

  const totalAsistencias = contar(data.total);
  const totalPrimeraVez = contar(data.primeraVez);
  const calificacion = data.calificacion?.[0];

  return {
    jornadaActual,
    porJornada: porJornada.map(({ clave, total }) => ({ clave, total })),
    porDia: (data.porDia || []).map((item) => ({ fecha: item._id, total: item.total })),
    porLugar: (data.porLugar || []).map((item) => ({
      lugar: item._id,
      total: item.total
    })),
    porMunicipio: (data.porMunicipio || []).map((item) => ({
      municipio: item._id,
      total: item.total
    })),
    asistentesUnicos: contar(data.unicos),
    totalAsistencias,
    nuevos: totalPrimeraVez,
    recurrentes: totalAsistencias - totalPrimeraVez,
    calificacionPromedio: calificacion
      ? Math.round(calificacion.promedio * 10) / 10
      : 0,
    calificacionVotos: calificacion ? calificacion.votos : 0,
    ultimaHora: (data.ultimaHora || []).map((item) => ({ hora: item._id, total: item.total })),
    actualizadoEn: new Date().toISOString()
  };
};
