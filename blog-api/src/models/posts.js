import { createStore } from '../../../shared/storage.js';
export const { records: posts, save: savePosts } = createStore('posts');
