import * as service from "../services/estadisticas.service.js";

export const getSnapshot = async (_req, res) => {
  try {
    res.json(await service.getSnapshot());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
