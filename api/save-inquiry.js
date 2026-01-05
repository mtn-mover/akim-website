// AKIM Inquiry Save API - Vercel Serverless Function
// Speichert abgeschlossene Chat-Anfragen in PostgreSQL
//
// WICHTIG: Falls die Tracking-Felder noch nicht in der DB existieren,
// führe folgendes SQL in der Neon-Konsole aus:
//
// ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS browser_language VARCHAR(20);
// ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);
// ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS referrer TEXT;
// ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS form_timestamp TIMESTAMP;

const { neon } = require('@neondatabase/serverless');
const { setCorsHeaders, handlePreflight } = require('./cors');

module.exports = async function handler(req, res) {
  // CORS Headers (erlaubt chat.akim.ch und akim.ch)
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) {
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

    // Inquiry speichern (inkl. Tracking-Daten)
    // ON CONFLICT: Falls session_id bereits existiert, UPDATE statt INSERT
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
        browser_language,
        timezone,
        referrer,
        form_timestamp,
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
        ${leadData?.browserLanguage || null},
        ${leadData?.timezone || null},
        ${leadData?.referrer || null},
        ${leadData?.timestamp || null},
        'new',
        NOW()
      )
      ON CONFLICT (session_id) DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        customer_email = EXCLUDED.customer_email,
        customer_phone = EXCLUDED.customer_phone,
        customer_company = EXCLUDED.customer_company,
        customer_country = EXCLUDED.customer_country,
        language = EXCLUDED.language,
        messages = EXCLUDED.messages,
        summary = EXCLUDED.summary,
        technical_data = EXCLUDED.technical_data,
        browser_language = EXCLUDED.browser_language,
        timezone = EXCLUDED.timezone,
        referrer = EXCLUDED.referrer,
        form_timestamp = EXCLUDED.form_timestamp,
        updated_at = NOW()
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

// Sendet E-Mail-Benachrichtigung an Sales
async function sendTechnicianNotification({ inquiryId, customerName, customerEmail, customerCompany, summary }) {
  // Sales E-Mail - Standard: help@akim.ch, kann via ENV überschrieben werden
  const notificationEmail = process.env.NOTIFICATION_EMAIL || 'help@akim.ch';

  if (!notificationEmail) {
    console.log('NOTIFICATION_EMAIL not configured, skipping notification');
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
        to: notificationEmail,
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
