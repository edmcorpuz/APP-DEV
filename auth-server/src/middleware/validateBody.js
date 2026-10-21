// Check the shape before the controller reads fields. Dili tanan JSON kay object.
export function validateBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Please send a JSON object.' });
  }
  next();
}
