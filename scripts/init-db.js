// AKIM Database Initialization - Vercel Serverless Function
// Erstellt die notwendigen Tabellen in PostgreSQL

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // Nur mit Secret-Key erlauben
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.INIT_DB_SECRET;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const sql = neon(process.env.POSTGRES_URL);

    // Inquiries-Tabelle erstellen
    await sql`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(100),
        customer_company VARCHAR(255),
        customer_country VARCHAR(10),
        language VARCHAR(5) DEFAULT 'de',
        messages JSONB NOT NULL,
        summary TEXT,
        technical_data JSONB,
        status VARCHAR(50) DEFAULT 'new',
        notes TEXT,
        assigned_to VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Index für schnellere Abfragen
    await sql`
      CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(customer_email)
    `;

    res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      tables: ['inquiries']
    });

  } catch (error) {
    console.error('Database init error:', error);
    res.status(500).json({ error: 'Failed to initialize database', details: error.message });
  }
};
