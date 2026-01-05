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

      // Bestätigungs-E-Mail an den Kunden senden
      await sendCustomerConfirmation(resendApiKey, inquiry, language);

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

// Bestätigungs-E-Mail an den Kunden senden
async function sendCustomerConfirmation(apiKey, inquiry, language) {
  const lang = (language || 'de').toLowerCase();
  const content = getConfirmationContent(inquiry, lang);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'AKIM AG <info@akim.ch>',
        to: [inquiry.email],
        subject: content.subject,
        html: content.html,
        text: content.text
      })
    });

    if (!response.ok) {
      console.error('Customer confirmation email failed:', await response.text());
    }
  } catch (error) {
    console.error('Customer confirmation error:', error);
  }
}

// Mehrsprachiger Inhalt für die Bestätigungs-E-Mail
function getConfirmationContent(inquiry, lang) {
  const customerName = inquiry.name || inquiry.company || '';

  const translations = {
    de: {
      subject: 'Vielen Dank für Ihre Anfrage - AKIM AG',
      greeting: customerName ? `Guten Tag ${customerName}` : 'Guten Tag',
      thanks: 'Vielen Dank für Ihre Anfrage über unseren Chatbot. Wir haben Ihre Informationen erhalten und freuen uns über Ihr Interesse an unseren Getriebe-Lösungen.',
      saved: 'Ihre Anfrage wurde erfolgreich gespeichert und unser Verkaufsteam wurde informiert.',
      nextSteps: 'Nächste Schritte',
      nextStepsText: 'Einer unserer Spezialisten wird Ihre Anfrage prüfen und sich schnellstmöglich bei Ihnen melden. Bei dringenden Anliegen erreichen Sie uns auch telefonisch.',
      contact: 'Kontakt',
      phone: 'Telefon',
      email: 'E-Mail',
      closing: 'Freundliche Grüsse',
      team: 'Ihr AKIM Team'
    },
    en: {
      subject: 'Thank you for your inquiry - AKIM AG',
      greeting: customerName ? `Dear ${customerName}` : 'Dear Sir or Madam',
      thanks: 'Thank you for your inquiry via our chatbot. We have received your information and appreciate your interest in our gear solutions.',
      saved: 'Your inquiry has been successfully saved and our sales team has been notified.',
      nextSteps: 'Next Steps',
      nextStepsText: 'One of our specialists will review your inquiry and get back to you as soon as possible. For urgent matters, you can also reach us by phone.',
      contact: 'Contact',
      phone: 'Phone',
      email: 'Email',
      closing: 'Best regards',
      team: 'Your AKIM Team'
    },
    fr: {
      subject: 'Merci pour votre demande - AKIM AG',
      greeting: customerName ? `Bonjour ${customerName}` : 'Bonjour',
      thanks: 'Merci pour votre demande via notre chatbot. Nous avons bien reçu vos informations et vous remercions de votre intérêt pour nos solutions d\'engrenages.',
      saved: 'Votre demande a été enregistrée avec succès et notre équipe commerciale a été informée.',
      nextSteps: 'Prochaines étapes',
      nextStepsText: 'Un de nos spécialistes examinera votre demande et vous contactera dans les plus brefs délais. Pour les questions urgentes, vous pouvez également nous joindre par téléphone.',
      contact: 'Contact',
      phone: 'Téléphone',
      email: 'E-mail',
      closing: 'Meilleures salutations',
      team: 'Votre équipe AKIM'
    }
  };

  const t = translations[lang] || translations.de;

  const text = `
${t.greeting},

${t.thanks}

${t.saved}

${t.nextSteps}
${t.nextStepsText}

${t.contact}:
${t.phone}: +41 52 644 06 46
${t.email}: help@akim.ch
Web: www.akim.ch

${t.closing},
${t.team}

--
AKIM AG
Industriestrasse 11
CH-8604 Volketswil
www.akim.ch
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #3D4771; color: white; padding: 30px; text-align: center; }
    .header img { max-width: 150px; margin-bottom: 10px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: normal; }
    .content { padding: 30px; background: #ffffff; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .message { margin-bottom: 25px; }
    .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; }
    .section h3 { color: #3D4771; margin-top: 0; font-size: 16px; }
    .contact-info { margin-top: 15px; }
    .contact-info p { margin: 5px 0; }
    .contact-info a { color: #D35F00; text-decoration: none; }
    .closing { margin-top: 30px; }
    .footer { background: #f5f5f5; padding: 20px 30px; font-size: 12px; color: #666; border-top: 3px solid #D35F00; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AKIM AG</h1>
    </div>

    <div class="content">
      <p class="greeting">${t.greeting},</p>

      <p class="message">${t.thanks}</p>

      <p class="message">${t.saved}</p>

      <div class="section">
        <h3>${t.nextSteps}</h3>
        <p>${t.nextStepsText}</p>
      </div>

      <div class="contact-info">
        <h3>${t.contact}</h3>
        <p><strong>${t.phone}:</strong> <a href="tel:+41526440646">+41 52 644 06 46</a></p>
        <p><strong>${t.email}:</strong> <a href="mailto:help@akim.ch">help@akim.ch</a></p>
        <p><strong>Web:</strong> <a href="https://www.akim.ch">www.akim.ch</a></p>
      </div>

      <div class="closing">
        <p>${t.closing},<br><strong>${t.team}</strong></p>
      </div>
    </div>

    <div class="footer">
      <p><strong>AKIM AG</strong></p>
      <p>Industriestrasse 11</p>
      <p>CH-8604 Volketswil</p>
      <p><a href="https://www.akim.ch">www.akim.ch</a></p>
    </div>
  </div>
</body>
</html>
`;

  return { subject: t.subject, text, html };
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
