// src/utils/parseDuration.js
function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') return 0;
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  if (isNaN(value)) return 0;
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default:  return 0;
  }
}

module.exports = { parseDuration };