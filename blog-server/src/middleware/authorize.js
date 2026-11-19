// "What are you allowed to do?" Runs after authenticate, so req.user is set.
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Only ${roles.join(' or ')} can do this.` });
  }
  next();
};
