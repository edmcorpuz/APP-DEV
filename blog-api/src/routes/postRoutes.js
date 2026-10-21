import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { listPosts, getPost, createPost, updatePost, deletePost, myPosts } from '../controllers/postController.js';
export const postRoutes = Router();
// Public routes stay public, even without an account.
postRoutes.get('/api/posts', listPosts);
postRoutes.get('/api/posts/:id', getPost);
postRoutes.get('/api/me/posts', authenticate, myPosts);
postRoutes.post('/api/posts', authenticate, authorize('author', 'admin'), createPost);
postRoutes.put('/api/posts/:id', authenticate, updatePost);
postRoutes.delete('/api/posts/:id', authenticate, authorize('admin'), deletePost);
