// AKIM Inquiry Save API - Vercel Serverless Function
// Speichert abgeschlossene Chat-Anfragen in PostgreSQL

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      sessionId,
      leadData,
      messages,
      summary,
      language,
      technicalData
    } = req.body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'sessionId and messages array required' });
      return;
    }

    // Datenbankverbindung
    const sql = neon(process.env.POSTGRES_URL);

    // Inquiry speichern
    const result = await sql`
      INSERT INTO inquiries (
        session_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_company,
        customer_country,
        language,
        messages,
        summary,
        technical_data,
        status,
        created_at
      ) VALUES (
        ${sessionId},
        ${leadData?.name || null},
        ${leadData?.email || null},
        ${leadData?.phone || null},
        ${leadData?.company || null},
        ${leadData?.country || null},
        ${language || 'de'},
        ${JSON.stringify(messages)},
        ${summary || null},
        ${technicalData ? JSON.stringify(technicalData) : null},
        'new',
        NOW()
      )
      RETURNING id, created_at
    `;

    const inquiryId = result[0].id;

    // E-Mail-Benachrichtigung an Techniker senden
    await sendTechnicianNotification({
      inquiryId,
      customerName: leadData?.name,
      customerEmail: leadData?.email,
      customerCompany: leadData?.company,
      summary
    });

    res.status(200).json({
      success: true,
      inquiryId,
      message: 'Inquiry saved successfully'
    });

  } catch (error) {
    console.error('Save inquiry error:', error);
    res.status(500).json({ error: 'Failed to save inquiry' });
  }
};

// Sendet E-Mail-Benachrichtigung an den Techniker
async function sendTechnicianNotification({ inquiryId, customerName, customerEmail, customerCompany, summary }) {
  // Techniker E-Mail aus Umgebungsvariable
  const technicianEmail = process.env.TECHNICIAN_EMAIL;

  if (!technicianEmail) {
    console.log('TECHNICIAN_EMAIL not configured, skipping notification');
    return;
  }

  // Verwende Resend API für E-Mail-Versand (oder anderen Provider)
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'AKIM Chatbot <noreply@akim.ch>',
        to: technicianEmail,
        subject: `Neue Anfrage von ${customerName || 'Unbekannt'} - AKIM Chatbot`,
        html: `
          <h2>Neue Chatbot-Anfrage eingegangen</h2>
          <p><strong>Anfrage-ID:</strong> ${inquiryId}</p>
          <p><strong>Kunde:</strong> ${customerName || 'Nicht angegeben'}</p>
          <p><strong>E-Mail:</strong> ${customerEmail || 'Nicht angegeben'}</p>
          <p><strong>Firma:</strong> ${customerCompany || 'Nicht angegeben'}</p>

          ${summary ? `<h3>Zusammenfassung:</h3><p>${summary}</p>` : ''}

          <p><a href="${process.env.ADMIN_URL || 'https://akim.ch'}/admin.html?id=${inquiryId}">Anfrage ansehen</a></p>
        `
      })
    });

    if (!response.ok) {
      console.error('Email notification failed:', await response.text());
    }
  } catch (error) {
    console.error('Email notification error:', error);
  }
}
