import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/authController.js';
import { validateBody } from '../middleware/validateBody.js';
export const authRoutes = Router();
authRoutes.post('/register', validateBody, register);
authRoutes.post('/login', validateBody, login);
authRoutes.post('/refresh', validateBody, refresh);
authRoutes.post('/logout', validateBody, logout);
