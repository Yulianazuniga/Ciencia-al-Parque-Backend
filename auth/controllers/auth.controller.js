import * as service from "../services/auth.service.js";

const mapStatus = (message) => {
  switch (message) {
    case "INVALID_CREDENTIALS":
    case "INVALID_REFRESH_TOKEN":
      return 401;
    case "USER_INACTIVE":
      return 403;
    case "EMAIL_ALREADY_EXISTS":
      return 409;
    case "Refresh token is required":
      return 400;
    default:
      return message?.includes("not found") ? 404 : 500;
  }
};

const respond = (res, error, successStatus, data) => {
  if (error) {
    const status = mapStatus(error.message);
    return res.status(status).json({ message: error.message });
  }
  return res.status(successStatus).json(data);
};

export const register = async (req, res) => {
  try {
    const usuario = await service.register(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    respond(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const data = await service.login(req.body.email, req.body.password);
    res.json(data);
  } catch (error) {
    respond(res, error);
  }
};

export const refresh = async (req, res) => {
  try {
    const data = await service.refresh(req.body.refreshToken);
    res.json(data);
  } catch (error) {
    respond(res, error);
  }
};

export const logout = async (req, res) => {
  try {
    const data = await service.logout(req.body.refreshToken);
    res.json(data);
  } catch (error) {
    respond(res, error);
  }
};

export const me = async (req, res) => {
  try {
    const data = await service.me(req.user.id);
    res.json(data);
  } catch (error) {
    respond(res, error);
  }
};
