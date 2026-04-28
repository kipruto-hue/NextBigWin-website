const crypto = require('crypto');

/**
 * Generates a unique, human-readable ticket ID.
 * Format: NBW-YYYY-XXXXXXXXX  (e.g. NBW-2026-A3F7K9Q2M)
 */
function generateTicketId() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 9);
  return `NBW-${year}-${rand}`;
}

module.exports = { generateTicketId };
