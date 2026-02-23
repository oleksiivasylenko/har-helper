import { getOrCreateUser } from '../database/users.js';

var DEFAULT_TOKEN = process.env.AUTH_TOKEN || 'default-user-token-12345';

export function authMiddleware(req, res, next) {
  var token = req.headers['x-auth-token'] || DEFAULT_TOKEN;
  
  try {
    var user = getOrCreateUser(token);
    req.userId = user.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
