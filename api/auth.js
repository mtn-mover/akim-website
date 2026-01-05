// AKIM Admin Authentication API
// Multi-User Session-basiertes Login für Admin-Bereich
//
// Environment Variables:
// - ADMIN_PASSWORD: Passwort für Benutzer "admin"
// - SALES_PASSWORD: Passwort für Benutzer "sales"
// - ENGINEERING_PASSWORD: Passwort für Benutzer "engineering"
// - ADMIN_SESSION_SECRET: Geheimer Schlüssel für Session-Token

const crypto = require('crypto');

// Benutzer-Konfiguration (Passwörter aus Environment Variables)
function getUsers() {
  return {
    admin: process.env.ADMIN_PASSWORD,
    sales: process.env.SALES_PASSWORD,
    engineering: process.env.ENGINEERING_PASSWORD
  };
}

// Session-Token generieren (gültig für 24 Stunden)
function generateSessionToken(username, secret) {
  const timestamp = Date.now();
  const expiresAt = timestamp + (24 * 60 * 60 * 1000); // 24 Stunden
  const data = `${username}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return Buffer.from(JSON.stringify({
    user: username,
    data,
    exp: expiresAt,
    sig: signature
  })).toString('base64');
}

// Session-Token validieren
function validateSessionToken(token, secret) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { user, data, exp, sig } = decoded;

    // Abgelaufen?
    if (Date.now() > exp) {
      return { valid: false, error: 'Token expired' };
    }

    // Signatur prüfen
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    if (sig !== expectedSig) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, user };
  } catch (e) {
    return { valid: false, error: 'Invalid token format' };
  }
}

const { setCorsHeaders, handlePreflight } = require('./cors');

module.exports = async function handler(req, res) {
  // CORS Headers (erlaubt chat.akim.ch und akim.ch)
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) {
    return;
  }

  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret';
  const { action } = req.query;

  // POST /api/auth?action=login - Login
  if (req.method === 'POST' && action === 'login') {
    const { username, password } = req.body;
    const users = getUsers();

    // Prüfen ob Benutzername gültig ist
    if (!username || !users.hasOwnProperty(username)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const expectedPassword = users[username];

    if (!expectedPassword) {
      res.status(500).json({ error: `Password for user "${username}" not configured` });
      return;
    }

    if (password !== expectedPassword) {
      // Kurze Verzögerung gegen Brute-Force
      await new Promise(resolve => setTimeout(resolve, 1000));
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = generateSessionToken(username, secret);
    res.status(200).json({
      success: true,
      token,
      user: username,
      expiresIn: '24h'
    });
    return;
  }

  // POST /api/auth?action=verify - Token prüfen
  if (req.method === 'POST' && action === 'verify') {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ valid: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const result = validateSessionToken(token, secret);

    res.status(result.valid ? 200 : 401).json(result);
    return;
  }

  res.status(400).json({ error: 'Invalid action. Use: login or verify' });
};
