import * as service from "../services/sorteos.service.js";

const mapStatus = (message) => {
  if (message === "JORNADA_NOT_FOUND") return 404;
  if (message === "JORNADA_SIN_REGISTROS") return 400;
  if (message === "NO_ELEGIBLES" || message === "SORTEO_CONFLICTO") return 409;
  return 500;
};

export const realizar = async (req, res) => {
  try {
    const resultado = await service.realizar(req.body, req.user?.id);
    res.status(201).json(resultado);
  } catch (error) {
    res.status(mapStatus(error.message)).json({ message: error.message });
  }
};

export const getAll = async (_req, res) => {
  try {
    res.json(await service.getAll());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
