// AKIM Update Inquiry API - Vercel Serverless Function
// Aktualisiert Status und Notizen einer Anfrage

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

module.exports = async function handler(req, res) {
  // CORS Headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://chat.akim.ch';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
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
    const { id, status, notes, assigned_to } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Inquiry ID required' });
      return;
    }

    const sql = neon(process.env.POSTGRES_URL);

    // Dynamisches Update basierend auf übergebenen Feldern
    const updates = [];
    const values = [];

    if (status) {
      updates.push('status');
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes');
      values.push(notes);
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to');
      values.push(assigned_to);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Update durchführen
    const result = await sql`
      UPDATE inquiries
      SET
        status = COALESCE(${status}, status),
        notes = COALESCE(${notes}, notes),
        assigned_to = COALESCE(${assigned_to}, assigned_to),
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING id, status, notes, assigned_to, updated_at
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }

    res.status(200).json({
      success: true,
      inquiry: result[0]
    });

  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
};
