import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('✅ Serving static files from dist/');
} else {
  console.log('❌ dist/ folder not found');
}

// Health checks
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'hairfy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'hairfy-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'hairfy-barbershop',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// WhatsApp placeholder endpoints
app.post('/api/whatsapp/connect', (req, res) => {
  res.json({ 
    success: false, 
    message: 'WhatsApp integration available in development mode. Contact support for production setup.' 
  });
});

app.get('/api/whatsapp/status', (req, res) => {
  res.json({ 
    connected: false,
    message: 'WhatsApp integration available in development mode'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

// Catch all - serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found - dist/index.html missing');
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Hairfy server running on port ${PORT}`);
  console.log(`📁 Serving from: ${__dirname}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API health: http://localhost:${PORT}/api/health`);
});