import { createStore } from '../../../shared/storage.js';
export const { records: users, save: saveUsers } = createStore('users');
