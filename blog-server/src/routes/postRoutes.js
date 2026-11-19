import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  listPosts, getPost, createPost, updatePost, deletePost, myPosts,
} from '../controllers/postController.js';

export const postRoutes = Router();

// authenticate is applied per route because the two GET routes are public.
postRoutes.get('/posts', listPosts);
postRoutes.get('/posts/:id', getPost);
postRoutes.post('/posts', authenticate, authorize('author', 'admin'), createPost);
postRoutes.put('/posts/:id', authenticate, updatePost); // owner-or-admin check is in the controller
postRoutes.delete('/posts/:id', authenticate, authorize('admin'), deletePost);
postRoutes.get('/me/posts', authenticate, myPosts);
