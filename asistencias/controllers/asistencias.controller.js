import * as service from "../services/asistencias.service.js";

export const verificar = async (req, res) => {
  try {
    res.json(await service.verificar(req.body.documento));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const registrar = async (req, res) => {
  try {
    // La actualización del dashboard la emite stats.socket.js vía
    // appEvents (ASISTENCIA_REGISTRADA) → snapshot completo por socket.io.
    const asistencia = await service.registrar(req.body);
    res.status(201).json({ asistencia });
  } catch (error) {
    if (error.message === "STAFF_PASSWORD_REQUERIDA") {
      return res.status(403).json({
        message: "Debe ingresar la contraseña de staff para registrarse como Staff",
        code: "STAFF_PASSWORD_REQUERIDA"
      });
    }
    if (error.message === "STAFF_PASSWORD_INVALIDA") {
      return res.status(403).json({
        message: "Contraseña de staff incorrecta",
        code: "STAFF_PASSWORD_INVALIDA"
      });
    }
    if (error.message === "DUPLICADO") {
      return res
        .status(409)
        .json({ message: "Ya existe una asistencia para este documento en esta jornada" });
    }
       if (error.message === "PROCEDENCIA_DETALLE_REQUERIDO") {
      return res.status(422).json({
        message: "Debe especificar procedencia si selecciona 'Otro'",
        code: "PROCEDENCIA_DETALLE_REQUERIDO"
      });
    }
    if (error.message === "REQUIERE_REGISTRO_COMPLETO") {
      return res.status(422).json({
        message: "Se requiere el registro completo del participante",
        code: "REQUIERE_REGISTRO_COMPLETO",
        camposFaltantes: error.camposFaltantes
      });
    }
 
    res.status(500).json({ message: error.message });
  }
};




export const verificarClaveStaff = async (req, res) => {
  try {
    res.json(await service.verificarClaveStaff(req.body.password));
  } catch (error) {
    if (error.message === "STAFF_PASSWORD_INVALIDA") {
      return res.status(403).json({
        message: "Contraseña de staff incorrecta",
        code: "STAFF_PASSWORD_INVALIDA"
      });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const resultado = await service.getAll({
      jornada: req.validatedQuery.jornada,
      formato: req.validatedQuery.formato
    });

    if (resultado.formato === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="asistencias.csv"');
      return res.send(`\uFEFF${resultado.contenido}`);
    }

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
