import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication token is required" });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
};

// Attaches req.auth when a valid token is present, but never blocks the request.
export const optionalAuth = (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (token) {
    try { req.auth = jwt.verify(token, process.env.JWT_SECRET); } catch { /* treat as anonymous */ }
  }
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.auth?.role)) return res.status(403).json({ message: "You do not have permission for this action" });
  next();
};
