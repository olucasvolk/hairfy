import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Hairfy Production Server Running'
  });
});

// Simple API endpoints for basic functionality
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'hairfy-barbershop',
    version: '1.0.0'
  });
});

// WhatsApp placeholder endpoints (simplified for production stability)
app.post('/api/whatsapp/connect', (req, res) => {
  res.json({ 
    success: false, 
    message: 'WhatsApp integration available in development mode. Contact support for production setup.' 
  });
});

app.post('/api/whatsapp/disconnect', (req, res) => {
  res.json({ success: true, message: 'WhatsApp disconnected' });
});

app.post('/api/whatsapp/send', (req, res) => {
  res.json({ 
    success: false, 
    message: 'WhatsApp messaging available in development mode. Contact support for production setup.' 
  });
});

app.get('/api/whatsapp/status', (req, res) => {
  res.json({ 
    connected: false,
    message: 'WhatsApp integration available in development mode'
  });
});

app.post('/api/whatsapp/test', (req, res) => {
  res.json({ 
    success: false, 
    message: 'WhatsApp testing available in development mode. Contact support for production setup.' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Server Error');
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Hairfy Production Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});