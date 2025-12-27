// AKIM Chatbot API - Vercel Serverless Function
// Verwendet Claude API für intelligente Gesprächsführung
// Mit RAG-Integration für Produktwissen

const { AKIM_SYSTEM_PROMPT, detectLanguage } = require('./system-prompt');
const rag = require('./rag');

// In-Memory Rate Limiting (wird bei Serverless-Funktionen pro Instance zurückgesetzt)
// Für Produktion: Redis oder Vercel KV empfohlen
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 Minute
const RATE_LIMIT_MAX = 20; // Max 20 Anfragen pro Minute pro IP

// Rate Limit prüfen
function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Alte Einträge bereinigen
  if (rateLimitMap.size > 1000) {
    for (const [key, data] of rateLimitMap) {
      if (data.timestamp < windowStart) {
        rateLimitMap.delete(key);
      }
    }
  }

  const current = rateLimitMap.get(ip);
  if (!current || current.timestamp < windowStart) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - current.count };
}

module.exports = async function handler(req, res) {
  // CORS Headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://chat.akim.ch';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'OK' });
    return;
  }

  // Nur POST erlauben
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate Limiting
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   req.connection?.remoteAddress ||
                   'unknown';

  const rateLimit = checkRateLimit(clientIP);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

  if (!rateLimit.allowed) {
    res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    return;
  }

  try {
    const { messages, sessionId, leadData, language: clientLanguage, _honeypot } = req.body;

    // Honeypot-Check: Wenn das versteckte Feld ausgefüllt ist, ist es ein Bot
    if (_honeypot) {
      // Fake-Erfolg zurückgeben um Bots nicht zu informieren
      res.status(200).json({
        message: 'Thank you for your message.',
        sessionId: 'blocked'
      });
      return;
    }

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array required' });
      return;
    }

    // API Key aus Umgebungsvariable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      res.status(500).json({ error: 'API not configured' });
      return;
    }

    // Sprache: Client-Sprache hat IMMER Priorität (vom Sprachauswahl-Dropdown)
    // Nur wenn keine Client-Sprache gesetzt ist, versuche aus Nachricht zu erkennen
    let language = clientLanguage;
    if (!language) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      language = firstUserMessage ? detectLanguage(firstUserMessage.content) : 'de';
    }

    // System-Prompt in der gewählten Sprache + Anweisung zur Sprachkonsistenz
    let systemPrompt = AKIM_SYSTEM_PROMPT[language] || AKIM_SYSTEM_PROMPT.de;

    // Zusätzliche Anweisung: Sprache beibehalten
    const languageInstruction = {
      de: '\n\nWICHTIG: Antworte IMMER auf Deutsch, unabhängig davon in welcher Sprache der Kunde schreibt. Die Sprache wurde vom Kunden explizit gewählt.',
      en: '\n\nIMPORTANT: ALWAYS respond in English, regardless of which language the customer writes in. The language was explicitly chosen by the customer.',
      fr: '\n\nIMPORTANT: Réponds TOUJOURS en français, quelle que soit la langue dans laquelle le client écrit. La langue a été explicitement choisie par le client.',
      it: '\n\nIMPORTANTE: Rispondi SEMPRE in italiano, indipendentemente dalla lingua in cui scrive il cliente. La lingua è stata scelta esplicitamente dal cliente.'
    };
    systemPrompt += languageInstruction[language] || languageInstruction.de;

    // Lead-Daten in System-Prompt einfügen wenn vorhanden
    if (leadData) {
      const leadInfo = buildLeadContext(leadData, language);
      systemPrompt = systemPrompt + '\n\n' + leadInfo;
    }

    // RAG: Relevante Produktinformationen abrufen
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    let ragContext = '';

    if (lastUserMessage && process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
      try {
        const relevantProducts = await rag.searchDocuments(lastUserMessage.content, 3, language);

        if (relevantProducts && relevantProducts.length > 0) {
          const productInfo = relevantProducts.map(p => {
            let info = `- ${p.name} (${p.category}): ${p.description || ''}`;
            info += ` | Drehmoment: ${p.rated_torque_nm}-${p.max_torque_nm} Nm`;
            if (p.inertia_kgcm2) info += ` | Massenträgheit: ${p.inertia_kgcm2} kgcm²`;
            if (p.weight_kg) info += ` | Gewicht: ${p.weight_kg} kg`;
            if (p.backlash_arcmin) info += ` | Verdrehspiel: ${p.backlash_arcmin} Bogenmin.`;
            if (p.ratio_range) info += ` | Übersetzung: ${p.ratio_range}`;
            if (p.max_input_speed_rpm) info += ` | Max. Eingangsdrehzahl: ${p.max_input_speed_rpm} min⁻¹`;
            if (p.efficiency_percent) info += ` | Wirkungsgrad: ${p.efficiency_percent}%`;
            info += ` | Anwendungen: ${(p.applications || []).join(', ')}`;
            return info;
          }).join('\n');

          const ragWarning = language === 'en'
            ? `\n\nWARNING: ONLY use the product data provided below. NEVER invent or guess technical specifications (weight, inertia, backlash, dimensions, etc.) that are not listed here. If a customer asks for details not in the database, say: "For detailed technical specifications, our specialists will provide you with the complete data sheet."`
            : `\n\nWICHTIG: Verwende AUSSCHLIESSLICH die unten aufgeführten Produktdaten. ERFINDE NIEMALS technische Spezifikationen (Gewicht, Massenträgheit, Verdrehspiel, Abmessungen, etc.) die nicht aufgeführt sind. Falls ein Kunde nach Details fragt die nicht in der Datenbank sind, sage: "Für detaillierte technische Spezifikationen stellen unsere Spezialisten Ihnen das vollständige Datenblatt zur Verfügung."`;

          ragContext = language === 'en'
            ? `${ragWarning}\n\nRELEVANT PRODUCTS FROM DATABASE:\n${productInfo}`
            : `${ragWarning}\n\nRELEVANTE PRODUKTE AUS DATENBANK:\n${productInfo}`;

          systemPrompt += ragContext;
        }
      } catch (ragError) {
        console.error('RAG search error (continuing without RAG):', ragError.message);
        // Continue without RAG if it fails
      }
    }

    // Claude API aufrufen
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', response.status, errorData);
      res.status(500).json({ error: 'AI service error' });
      return;
    }

    const data = await response.json();
    const assistantMessage = data.content[0].text;

    // Prüfen ob die Konversation abgeschlossen werden soll
    // (Wenn alle Pflichtdaten gesammelt wurden)
    const isComplete = checkIfInquiryComplete(messages, assistantMessage, leadData);

    res.status(200).json({
      message: assistantMessage,
      language: language,
      isComplete: isComplete,
      sessionId: sessionId || generateSessionId()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Prüft ob die Anfrage alle Pflichtdaten enthält
function checkIfInquiryComplete(messages, lastResponse, leadData) {
  const allText = messages.map(m => m.content).join(' ').toLowerCase() + ' ' + lastResponse.toLowerCase();

  // E-Mail: entweder aus Lead-Daten oder aus Chat
  const hasEmail = (leadData && leadData.email) || /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(allText);

  // Suche nach technischen Daten (Nm, min-1, Übersetzung, rpm)
  const hasTechnicalData = /\d+\s*(nm|min|rpm|:1|drehmoment|torque|übersetzung|ratio)/i.test(allText);

  // Suche nach Abschluss-Indikatoren in der letzten Antwort
  // Erweitert um mehr Schlüsselwörter die Alex verwendet
  const hasCompletionIndicator = /(zusammenfassung|summary|anfrage absenden|send inquiry|offerte|quote|weiterleiten|spezialisten|anfrage so an|shall i forward|should i send)/i.test(lastResponse);

  return hasEmail && hasTechnicalData && hasCompletionIndicator;
}

// Generiert eine Session-ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Erstellt Kontext aus Lead-Daten für den System-Prompt
function buildLeadContext(leadData, language) {
  const templates = {
    de: `
WICHTIG - KUNDENDATEN (bereits vom Formular erfasst):
Der Kunde hat bereits folgende Daten eingegeben, bevor er den Chat gestartet hat. Du MUSST diese Informationen verwenden und darfst NICHT erneut danach fragen:
- Name: ${leadData.name || 'Nicht angegeben'}
- E-Mail: ${leadData.email || 'Nicht angegeben'}
- Telefon: ${leadData.phone || 'Nicht angegeben'}
- Firma: ${leadData.company || 'Nicht angegeben'}
- Land: ${leadData.country || 'Nicht angegeben'}

ANWEISUNGEN:
- Sprich den Kunden mit seinem Vornamen an (${leadData.name ? leadData.name.split(' ')[0] : 'der Kunde'})
- Frage NIEMALS nach Name, E-Mail, Telefon, Firma oder Land - diese Daten hast du bereits!
- Konzentriere dich nur auf die technischen Anforderungen für das Getriebe
- Wenn du eine Offerte/Zusammenfassung erstellst, verwende die oben genannten Kontaktdaten`,

    en: `
IMPORTANT - CUSTOMER DATA (already captured from form):
The customer has already entered the following data before starting the chat. You MUST use this information and must NOT ask for it again:
- Name: ${leadData.name || 'Not provided'}
- Email: ${leadData.email || 'Not provided'}
- Phone: ${leadData.phone || 'Not provided'}
- Company: ${leadData.company || 'Not provided'}
- Country: ${leadData.country || 'Not provided'}

INSTRUCTIONS:
- Address the customer by their first name (${leadData.name ? leadData.name.split(' ')[0] : 'the customer'})
- NEVER ask for name, email, phone, company or country - you already have this data!
- Focus only on the technical requirements for the gearbox
- When creating a quote/summary, use the contact details listed above`,

    fr: `
IMPORTANT - DONNÉES CLIENT (déjà saisies via le formulaire):
Le client a déjà saisi les données suivantes avant de démarrer le chat. Tu DOIS utiliser ces informations et tu ne dois PAS les redemander:
- Nom: ${leadData.name || 'Non indiqué'}
- E-mail: ${leadData.email || 'Non indiqué'}
- Téléphone: ${leadData.phone || 'Non indiqué'}
- Entreprise: ${leadData.company || 'Non indiqué'}
- Pays: ${leadData.country || 'Non indiqué'}

INSTRUCTIONS:
- Adresse-toi au client par son prénom (${leadData.name ? leadData.name.split(' ')[0] : 'le client'})
- Ne demande JAMAIS le nom, l'e-mail, le téléphone, l'entreprise ou le pays - tu as déjà ces données!
- Concentre-toi uniquement sur les exigences techniques du réducteur
- Lors de la création d'un devis/résumé, utilise les coordonnées indiquées ci-dessus`,

    it: `
IMPORTANTE - DATI CLIENTE (già acquisiti dal modulo):
Il cliente ha già inserito i seguenti dati prima di avviare la chat. DEVI usare queste informazioni e NON devi richiederle:
- Nome: ${leadData.name || 'Non indicato'}
- E-mail: ${leadData.email || 'Non indicato'}
- Telefono: ${leadData.phone || 'Non indicato'}
- Azienda: ${leadData.company || 'Non indicato'}
- Paese: ${leadData.country || 'Non indicato'}

ISTRUZIONI:
- Rivolgiti al cliente usando il suo nome (${leadData.name ? leadData.name.split(' ')[0] : 'il cliente'})
- Non chiedere MAI nome, e-mail, telefono, azienda o paese - hai già questi dati!
- Concentrati solo sui requisiti tecnici del riduttore
- Quando crei un preventivo/riepilogo, usa i dati di contatto sopra indicati`
  };

  return templates[language] || templates.de;
}
