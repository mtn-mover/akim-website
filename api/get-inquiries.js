// AKIM Get Inquiries API - Vercel Serverless Function
// Lädt Anfragen aus der Datenbank für die Admin-Ansicht

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Einfache Auth-Prüfung (kann später durch bessere Auth ersetzt werden)
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
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
