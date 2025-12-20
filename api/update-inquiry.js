// AKIM Update Inquiry API - Vercel Serverless Function
// Aktualisiert Status und Notizen einer Anfrage

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Auth-Prüfung
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
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
