// CORS Helper - Zentrale CORS-Konfiguration für alle API-Endpoints
// Erlaubt mehrere Origins (chat.akim.ch und akim.ch)

const ALLOWED_ORIGINS = [
  'https://chat.akim.ch',
  'https://akim.ch',
  'https://www.akim.ch'
];

// Für lokale Entwicklung
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://localhost:5500');
  ALLOWED_ORIGINS.push('http://127.0.0.1:5500');
}

/**
 * Setzt CORS-Headers basierend auf dem Request-Origin
 * @param {Object} req - Request-Objekt
 * @param {Object} res - Response-Objekt
 * @returns {boolean} - true wenn Origin erlaubt, false wenn nicht
 */
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  // Prüfen ob Origin in der erlaubten Liste ist
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin Requests haben keinen Origin-Header
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  } else {
    // Unbekannter Origin - trotzdem ersten erlaubten setzen für Preflight
    // Der eigentliche Request wird aber blockiert wenn Origin nicht matched
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  return !origin || ALLOWED_ORIGINS.includes(origin);
}

/**
 * Behandelt CORS Preflight (OPTIONS) Requests
 * @param {Object} req - Request-Objekt
 * @param {Object} res - Response-Objekt
 * @returns {boolean} - true wenn es ein Preflight war und behandelt wurde
 */
function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = {
  setCorsHeaders,
  handlePreflight,
  ALLOWED_ORIGINS
};
