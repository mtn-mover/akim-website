// AKIM Chatbot API - Vercel Serverless Function
// Verwendet Claude API für intelligente Gesprächsführung

const { AKIM_SYSTEM_PROMPT, detectLanguage } = require('./system-prompt');

// CORS Headers für die Response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async function handler(req, res) {
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

  try {
    const { messages, sessionId } = req.body;

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

    // Sprache aus der ersten Nachricht erkennen
    const firstUserMessage = messages.find(m => m.role === 'user');
    const language = firstUserMessage ? detectLanguage(firstUserMessage.content) : 'de';
    const systemPrompt = AKIM_SYSTEM_PROMPT[language] || AKIM_SYSTEM_PROMPT.de;

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
    const isComplete = checkIfInquiryComplete(messages, assistantMessage);

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
function checkIfInquiryComplete(messages, lastResponse) {
  const allText = messages.map(m => m.content).join(' ').toLowerCase() + ' ' + lastResponse.toLowerCase();

  // Suche nach E-Mail Pattern
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(allText);

  // Suche nach technischen Daten (Nm, min-1, Übersetzung)
  const hasTechnicalData = /\d+\s*(nm|min|:1|drehmoment|torque|übersetzung|ratio)/i.test(allText);

  // Suche nach Abschluss-Indikatoren in der letzten Antwort
  const hasCompletionIndicator = /(zusammenfassung|summary|anfrage absenden|send inquiry|offerte|quote)/i.test(lastResponse);

  return hasEmail && hasTechnicalData && hasCompletionIndicator;
}

// Generiert eine Session-ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
