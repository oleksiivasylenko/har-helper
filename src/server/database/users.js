import { getOne, insertAndGetId } from './init.js';

export function getUserByToken(token) {
  return getOne('SELECT * FROM users WHERE token = ?', [token]);
}

export function createUser(token) {
  var id = insertAndGetId('INSERT INTO users (token) VALUES (?)', [token]);
  return { id: id, token: token };
}

export function getOrCreateUser(token) {
  var user = getUserByToken(token);
  if (user) return user;
  return createUser(token);
}
