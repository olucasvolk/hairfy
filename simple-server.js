const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;

console.log('Starting simple server...');

// Verificar se a pasta dist existe
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('ERROR: dist folder not found!');
  process.exit(1);
}

// Verificar se index.html existe
const indexPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('ERROR: dist/index.html not found!');
  process.exit(1);
}

console.log('✅ dist folder found');
console.log('✅ index.html found');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'hairfy-simple',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
    return;
  }

  // Serve static files
  let filePath;
  
  if (pathname === '/') {
    filePath = path.join(__dirname, 'dist', 'index.html');
  } else {
    filePath = path.join(__dirname, 'dist', pathname);
  }

  console.log(`Trying to serve: ${filePath}`);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`File not found: ${filePath}, serving index.html`);
      // Serve index.html for SPA routing
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          console.error('Failed to read index.html:', indexErr);
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    console.log(`Serving: ${filePath} (${contentType})`);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Server running on port ${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});