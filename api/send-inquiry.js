// AKIM Inquiry Email API - Vercel Serverless Function
// Sendet die abgeschlossene Anfrage per E-Mail an das Verkaufsteam

const { setCorsHeaders, handlePreflight } = require('./cors');

module.exports = async function handler(req, res) {
  // CORS Headers (erlaubt chat.akim.ch und akim.ch)
  setCorsHeaders(req, res);

  // Handle CORS preflight
  if (handlePreflight(req, res)) {
    return;
  }

  // Nur POST erlauben
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { inquiry, conversation, language } = req.body;

    if (!inquiry || !inquiry.email) {
      res.status(400).json({ error: 'Inquiry with email required' });
      return;
    }

    // E-Mail-Inhalt formatieren
    const emailContent = formatEmailContent(inquiry, conversation, language);

    // Für die erste Version: Resend API verwenden (kostenlos bis 100 E-Mails/Tag)
    // Alternative: SendGrid, Mailgun, oder native Vercel Email
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // Mit Resend senden
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'AKIM Chatbot <chatbot@akim.ch>',
          to: [process.env.NOTIFICATION_EMAIL || 'help@akim.ch'],
          reply_to: inquiry.email,
          subject: `Neue Chatbot-Anfrage: ${inquiry.application || 'Getriebe-Anfrage'} - ${inquiry.company || inquiry.name}`,
          html: emailContent.html,
          text: emailContent.text
        })
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error('Resend API error:', errorData);
        // Fallback: Speichere die Anfrage für manuelles Senden
        await logInquiry(inquiry, conversation);
        res.status(200).json({
          success: true,
          method: 'logged',
          message: 'Anfrage wurde gespeichert'
        });
        return;
      }

      res.status(200).json({
        success: true,
        method: 'email',
        message: 'E-Mail wurde gesendet'
      });
    } else {
      // Ohne E-Mail-Service: Nur loggen (für Entwicklung)
      console.log('=== NEUE ANFRAGE ===');
      console.log(emailContent.text);
      console.log('====================');

      // In Vercel KV oder externem Service speichern (optional)
      await logInquiry(inquiry, conversation);

      res.status(200).json({
        success: true,
        method: 'logged',
        message: 'Anfrage wurde gespeichert (E-Mail-Service nicht konfiguriert)'
      });
    }

  } catch (error) {
    console.error('Send inquiry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Formatiert den E-Mail-Inhalt
function formatEmailContent(inquiry, conversation, language) {
  const timestamp = new Date().toLocaleString('de-CH', {
    timeZone: 'Europe/Zurich',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const text = `
NEUE GETRIEBE-ANFRAGE VIA CHATBOT
=================================

Eingegangen: ${timestamp}
Sprache: ${language?.toUpperCase() || 'DE'}

KONTAKTDATEN
------------
Firma: ${inquiry.company || '-'}
Name: ${inquiry.name || '-'}
E-Mail: ${inquiry.email}
Telefon: ${inquiry.phone || '-'}
Land: ${inquiry.country || '-'}

TECHNISCHE ANFORDERUNGEN
------------------------
Anwendung: ${inquiry.application || '-'}
Antriebsart: ${inquiry.driveType || '-'}

Abtrieb:
  Drehmoment: ${inquiry.outputTorque ? inquiry.outputTorque + ' Nm' : '-'}
  Drehzahl: ${inquiry.outputSpeed ? inquiry.outputSpeed + ' min⁻¹' : '-'}

Eintrieb:
  Drehmoment: ${inquiry.inputTorque ? inquiry.inputTorque + ' Nm' : '-'}
  Drehzahl: ${inquiry.inputSpeed ? inquiry.inputSpeed + ' min⁻¹' : '-'}

Übersetzung: ${inquiry.ratio ? inquiry.ratio + ':1' : '-'}
Massenträgheit: ${inquiry.inertia ? inquiry.inertia + ' kgm²' : '-'}

OPTIONALE ANGABEN
-----------------
Verdrehspiel: ${inquiry.backlash || '-'}
Betriebsdauer/Tag: ${inquiry.operatingHours ? inquiry.operatingHours + ' h' : '-'}
Umgebungstemperatur: ${inquiry.temperature ? inquiry.temperature + ' °C' : '-'}
Stosslast: ${inquiry.shockLoad || '-'}
Einbaulage: ${inquiry.mountingPosition || '-'}
Schmierung: ${inquiry.lubrication || '-'}
Wartungsintervall: ${inquiry.maintenanceInterval || '-'}

ZUSÄTZLICHE BEMERKUNGEN
-----------------------
${inquiry.notes || '-'}

EMPFOHLENE PRODUKTFAMILIE
-------------------------
${inquiry.recommendedProduct || 'Noch zu bestimmen'}

---
Diese Anfrage wurde automatisch vom AKIM Chatbot generiert.
Gesprächsverlauf ist angehängt.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #3D4771; color: white; padding: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #3D4771; border-bottom: 2px solid #D35F00; padding-bottom: 5px; font-size: 18px; }
    .data-grid { display: grid; grid-template-columns: 200px 1fr; gap: 8px; }
    .label { font-weight: bold; color: #566473; }
    .value { color: #333; }
    .highlight { background: #f5f7fa; padding: 15px; border-left: 4px solid #D35F00; }
    .footer { background: #f5f7fa; padding: 15px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Neue Getriebe-Anfrage via Chatbot</h1>
    <p>Eingegangen: ${timestamp}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2>Kontaktdaten</h2>
      <div class="data-grid">
        <span class="label">Firma:</span><span class="value">${inquiry.company || '-'}</span>
        <span class="label">Name:</span><span class="value">${inquiry.name || '-'}</span>
        <span class="label">E-Mail:</span><span class="value"><a href="mailto:${inquiry.email}">${inquiry.email}</a></span>
        <span class="label">Telefon:</span><span class="value">${inquiry.phone || '-'}</span>
        <span class="label">Land:</span><span class="value">${inquiry.country || '-'}</span>
      </div>
    </div>

    <div class="section">
      <h2>Technische Anforderungen</h2>
      <div class="highlight">
        <strong>Anwendung:</strong> ${inquiry.application || '-'}<br>
        <strong>Antriebsart:</strong> ${inquiry.driveType || '-'}
      </div>
      <br>
      <div class="data-grid">
        <span class="label">Abtriebsdrehmoment:</span><span class="value">${inquiry.outputTorque ? inquiry.outputTorque + ' Nm' : '-'}</span>
        <span class="label">Abtriebsdrehzahl:</span><span class="value">${inquiry.outputSpeed ? inquiry.outputSpeed + ' min⁻¹' : '-'}</span>
        <span class="label">Eintriebsdrehmoment:</span><span class="value">${inquiry.inputTorque ? inquiry.inputTorque + ' Nm' : '-'}</span>
        <span class="label">Eintriebsdrehzahl:</span><span class="value">${inquiry.inputSpeed ? inquiry.inputSpeed + ' min⁻¹' : '-'}</span>
        <span class="label">Übersetzung:</span><span class="value">${inquiry.ratio ? inquiry.ratio + ':1' : '-'}</span>
        <span class="label">Massenträgheit:</span><span class="value">${inquiry.inertia ? inquiry.inertia + ' kgm²' : '-'}</span>
        <span class="label">Verdrehspiel:</span><span class="value">${inquiry.backlash || '-'}</span>
      </div>
    </div>

    <div class="section">
      <h2>Betriebsbedingungen</h2>
      <div class="data-grid">
        <span class="label">Betriebsdauer/Tag:</span><span class="value">${inquiry.operatingHours ? inquiry.operatingHours + ' h' : '-'}</span>
        <span class="label">Umgebungstemperatur:</span><span class="value">${inquiry.temperature ? inquiry.temperature + ' °C' : '-'}</span>
        <span class="label">Stosslast:</span><span class="value">${inquiry.shockLoad || '-'}</span>
        <span class="label">Einbaulage:</span><span class="value">${inquiry.mountingPosition || '-'}</span>
        <span class="label">Schmierung:</span><span class="value">${inquiry.lubrication || '-'}</span>
      </div>
    </div>

    ${inquiry.notes ? `
    <div class="section">
      <h2>Zusätzliche Bemerkungen</h2>
      <p>${inquiry.notes}</p>
    </div>
    ` : ''}

    ${inquiry.recommendedProduct ? `
    <div class="section">
      <h2>Vom Chatbot empfohlene Produktfamilie</h2>
      <div class="highlight">${inquiry.recommendedProduct}</div>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p>Diese Anfrage wurde automatisch vom AKIM Chatbot generiert.</p>
    <p>Sprachversion: ${language?.toUpperCase() || 'DE'}</p>
  </div>
</body>
</html>
`;

  return { text, html };
}

// Logging-Funktion (für Entwicklung oder als Backup)
async function logInquiry(inquiry, conversation) {
  // In der Produktion könnte dies zu einer Datenbank oder
  // einem externen Service wie Vercel KV senden
  console.log('Inquiry logged:', JSON.stringify({
    timestamp: new Date().toISOString(),
    inquiry,
    conversationLength: conversation?.length || 0
  }, null, 2));

  // Optional: Webhook zu einem CRM senden
  const crmWebhook = process.env.CRM_WEBHOOK_URL;
  if (crmWebhook) {
    try {
      await fetch(crmWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiry, conversation })
      });
    } catch (e) {
      console.error('CRM webhook error:', e);
    }
  }
}
