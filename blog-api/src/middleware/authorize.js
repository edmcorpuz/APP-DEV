// Authorization = unsa imong pwede buhaton? Identity was already checked.
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Your role cannot perform this action.' });
  next();
};
