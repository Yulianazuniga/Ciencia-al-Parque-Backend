export const verifyRole = (allowedRoles) => (req, res, next) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(req.user?.rol)) {
    return res.status(403).json({ message: "Access forbidden: Insufficient role" });
  }
  next();
};
