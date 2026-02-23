import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './src/server/database/init.js';
import { getOrCreateUser } from './src/server/database/users.js';
import { authMiddleware } from './src/server/middleware/auth.js';
import archivesRouter from './src/server/routes/archives.js';
import filtersRouter from './src/server/routes/filters.js';
import exportSettingsRouter from './src/server/routes/exportSettings.js';
import settingsRouter from './src/server/routes/settings.js';

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = express();
var PORT = process.env.PORT || 3000;

var DEFAULT_TOKEN = process.env.AUTH_TOKEN || 'default-user-token-12345';

async function startServer() {
  var dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  await initDatabase();
  getOrCreateUser(DEFAULT_TOKEN);

  app.use(cors());
  app.use(express.json({ limit: '500mb' }));

  app.get('/api/config', function(req, res) {
    res.json({ token: DEFAULT_TOKEN });
  });

  app.use('/api/archives', authMiddleware, archivesRouter);
  app.use('/api/filters', authMiddleware, filtersRouter);
  app.use('/api/export-settings', authMiddleware, exportSettingsRouter);
  app.use('/api/settings', authMiddleware, settingsRouter);

  var distDir = path.join(__dirname, 'dist');
  var distExists = fs.existsSync(distDir);
  
  if (distExists) {
    app.use(express.static(distDir));
    
    app.get('*', function(req, res) {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distDir, 'index.html'));
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'public')));
  }

  app.listen(PORT, function() {
    console.log('HAR Helper running at http://localhost:' + PORT);
  });
}

startServer().catch(function(err) {
  console.error('Failed to start server:', err);
  process.exit(1);
});
