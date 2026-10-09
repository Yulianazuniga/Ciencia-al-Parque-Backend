import * as service from "../services/jornadas.service.js";

export const getActual = async (_req, res) => {
  try {
    res.json(await service.getActual());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    res.json(await service.getAll({ conRegistros: req.validatedQuery.conRegistros }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
