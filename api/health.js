export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'hairfy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}