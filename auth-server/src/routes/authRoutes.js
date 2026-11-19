import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/authController.js';

export const authRoutes = Router();
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refresh);
authRoutes.post('/logout', logout);
