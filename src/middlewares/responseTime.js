export default function responseTime(req, res, next) {
  const startTime = process.hrtime();

  res.startTime = startTime;

  next();
}
