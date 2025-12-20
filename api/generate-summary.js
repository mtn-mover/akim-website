// AKIM Generate Summary API - Vercel Serverless Function
// Generiert eine Zusammenfassung der Chat-Konversation

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
    const { messages, leadData, language } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array required' });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'API not configured' });
      return;
    }

    // Zusammenfassungs-Prompt basierend auf Sprache
    const summaryPrompts = {
      de: `Erstelle eine kurze, strukturierte Zusammenfassung dieser Getriebe-Anfrage für das AKIM Verkaufsteam.

Format:
**Kunde:** [Name, Firma, Land]
**Anwendung:** [Was soll angetrieben werden]
**Technische Anforderungen:** [Drehmoment, Drehzahl, Übersetzung wenn genannt]
**Produktempfehlung:** [Welches AKIM Getriebe wurde empfohlen]
**Besonderheiten:** [Spezielle Wünsche oder Anforderungen]
**Status:** [Offen/Offerte angefragt]

Halte die Zusammenfassung unter 200 Wörter.`,
      en: `Create a brief, structured summary of this gearbox inquiry for the AKIM sales team.

Format:
**Customer:** [Name, Company, Country]
**Application:** [What needs to be driven]
**Technical Requirements:** [Torque, Speed, Ratio if mentioned]
**Product Recommendation:** [Which AKIM gearbox was recommended]
**Special Notes:** [Special requests or requirements]
**Status:** [Open/Quote requested]

Keep the summary under 200 words.`,
      fr: `Créez un résumé bref et structuré de cette demande de réducteur pour l'équipe commerciale AKIM.

Format:
**Client:** [Nom, Entreprise, Pays]
**Application:** [Ce qui doit être entraîné]
**Exigences techniques:** [Couple, Vitesse, Rapport si mentionné]
**Recommandation produit:** [Quel réducteur AKIM a été recommandé]
**Notes spéciales:** [Demandes ou exigences particulières]
**Statut:** [Ouvert/Devis demandé]

Gardez le résumé sous 200 mots.`,
      it: `Crea un breve riepilogo strutturato di questa richiesta di riduttore per il team vendite AKIM.

Formato:
**Cliente:** [Nome, Azienda, Paese]
**Applicazione:** [Cosa deve essere azionato]
**Requisiti tecnici:** [Coppia, Velocità, Rapporto se menzionato]
**Raccomandazione prodotto:** [Quale riduttore AKIM è stato raccomandato]
**Note speciali:** [Richieste o requisiti particolari]
**Stato:** [Aperto/Preventivo richiesto]

Mantieni il riepilogo sotto 200 parole.`
    };

    const systemPrompt = summaryPrompts[language] || summaryPrompts.de;

    // Konversation für Claude vorbereiten
    const conversationText = messages.map(m =>
      `${m.role === 'user' ? 'Kunde' : 'Alex'}: ${m.content}`
    ).join('\n\n');

    // Lead-Daten hinzufügen wenn vorhanden
    let context = conversationText;
    if (leadData) {
      context = `Kundendaten aus Formular:
- Name: ${leadData.name || 'Nicht angegeben'}
- E-Mail: ${leadData.email || 'Nicht angegeben'}
- Telefon: ${leadData.phone || 'Nicht angegeben'}
- Firma: ${leadData.company || 'Nicht angegeben'}
- Land: ${leadData.country || 'Nicht angegeben'}

Konversation:
${conversationText}`;
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
        max_tokens: 500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: context
        }]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status);
      res.status(500).json({ error: 'Failed to generate summary' });
      return;
    }

    const data = await response.json();
    const summary = data.content[0].text;

    res.status(200).json({
      success: true,
      summary: summary
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
