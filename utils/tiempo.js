import { TIMEZONE, HORA_CORTE_MANANA } from "../config/config.js";

const BOGOTA_OFFSET_HORAS = 5;

const fechaFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const horaFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  hour12: false
});

export const TURNOS = ["MANANA", "TARDE"];

export const fechaBogota = (date = new Date()) => fechaFormatter.format(date);

export const horaBogota = (date = new Date()) => Number(horaFormatter.format(date));

export const turnoSegunHora = (date = new Date()) =>
  horaBogota(date) < HORA_CORTE_MANANA ? "MANANA" : "TARDE";

export const sufijoTurno = (turno) => (turno === "MANANA" ? "M" : "T");

export const claveJornada = (fecha, turno) => `${fecha}-${sufijoTurno(turno)}`;

export const rangoJornada = (fecha, turno) => {
  const [year, month, day] = fecha.split("-").map(Number);
  const inicioHora = turno === "MANANA" ? 0 : HORA_CORTE_MANANA;
  const finHora = turno === "MANANA" ? HORA_CORTE_MANANA : 24;

  const inicio = new Date(Date.UTC(year, month - 1, day, inicioHora + BOGOTA_OFFSET_HORAS, 0, 0));
  const fin = new Date(Date.UTC(year, month - 1, day, finHora + BOGOTA_OFFSET_HORAS, 0, 0) - 1);

  return { inicio, fin };
};

export const jornadaVigente = (date = new Date()) => {
  const fecha = fechaBogota(date);
  const turno = turnoSegunHora(date);
  return { fecha, turno, clave: claveJornada(fecha, turno) };
};

export const siguienteTurno = ({ fecha, turno }) => {
  if (turno === "MANANA") return { fecha, turno: "TARDE" };
  const [year, month, day] = fecha.split("-").map(Number);
  const siguiente = new Date(Date.UTC(year, month - 1, day + 1));
  const siguienteFecha = siguiente.toISOString().slice(0, 10);
  return { fecha: siguienteFecha, turno: "MANANA" };
};
