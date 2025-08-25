export default function handler(req, res) {
  res.status(200).json({
    status: 'running',
    service: 'hairfy-barbershop',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
}