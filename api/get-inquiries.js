// AKIM Get Inquiries API - Vercel Serverless Function
// Lädt Anfragen aus der Datenbank für die Admin-Ansicht

const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

// Session-Token validieren (gleiche Logik wie in auth.js)
function validateSessionToken(token, secret) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { data, exp, sig } = decoded;

    if (Date.now() > exp) {
      return { valid: false, error: 'Token expired' };
    }

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    if (sig !== expectedSig) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
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

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Session-Token Authentifizierung
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret';
  const validation = validateSessionToken(token, secret);

  if (!validation.valid) {
    res.status(401).json({ error: 'Unauthorized', reason: validation.error });
    return;
  }

  try {
    const sql = neon(process.env.POSTGRES_URL);

    const { id, status, limit = 50, offset = 0 } = req.query;

    let inquiries;

    if (id) {
      // Einzelne Anfrage laden
      inquiries = await sql`
        SELECT * FROM inquiries WHERE id = ${parseInt(id)}
      `;
    } else if (status) {
      // Nach Status filtern
      inquiries = await sql`
        SELECT
          id, session_id, customer_name, customer_email, customer_company,
          customer_country, language, summary, status, created_at, updated_at
        FROM inquiries
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
    } else {
      // Alle laden (ohne messages für Übersicht)
      inquiries = await sql`
        SELECT
          id, session_id, customer_name, customer_email, customer_company,
          customer_country, language, summary, status, created_at, updated_at
        FROM inquiries
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
    }

    // Gesamtanzahl für Paginierung
    const countResult = await sql`SELECT COUNT(*) as total FROM inquiries`;
    const total = parseInt(countResult[0].total);

    res.status(200).json({
      success: true,
      inquiries,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
};
