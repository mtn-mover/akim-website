/**
 * AKIM Chatbot Widget
 * Intelligenter Verkaufsassistent für Getriebe-Anfragen
 */

(function() {
  'use strict';

  // Konfiguration
  const CONFIG = {
    apiEndpoint: '/api/chat',
    sendEndpoint: '/api/send-inquiry',
    saveEndpoint: '/api/save-inquiry',
    maxMessages: 50,
    typingDelay: 500,
    requireLeadForm: true  // Chatbot erst nach Formular öffnen
  };

  // Zustand
  let state = {
    isOpen: false,
    isLoading: false,
    messages: [],
    sessionId: null,
    language: 'de',
    collectedData: {},
    leadData: null,  // Daten aus dem Lead-Formular
    languageLocked: false  // Sprache gesperrt nach erster User-Nachricht
  };

  // Übersetzungen
  const i18n = {
    de: {
      title: 'Alex - AKIM Berater',
      subtitle: 'Ihr persönlicher Getriebe-Experte',
      placeholder: 'Ihre Nachricht...',
      send: 'Senden',
      close: 'Schliessen',
      minimize: 'Minimieren',
      greeting: 'Hallo! Ich bin Alex, Ihr persönlicher Berater bei AKIM. Ich helfe Ihnen gerne, das passende Präzisionsgetriebe für Ihre Anwendung zu finden. Was möchten Sie antreiben?',
      error: 'Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.',
      sending: 'Wird gesendet...',
      sent: 'Anfrage gesendet!',
      confirmSend: 'Möchten Sie die Anfrage absenden?',
      yes: 'Ja, absenden',
      no: 'Nein, weiter bearbeiten',
      endPrompt: 'Wie möchten Sie fortfahren?',
      endChat: 'Chat beenden',
      newInquiry: 'Neue Anfrage besprechen'
    },
    en: {
      title: 'Alex - AKIM Advisor',
      subtitle: 'Your personal gearbox expert',
      placeholder: 'Your message...',
      send: 'Send',
      close: 'Close',
      minimize: 'Minimize',
      greeting: 'Hello! I\'m Alex, your personal advisor at AKIM. I\'m happy to help you find the right precision gearbox for your application. What do you want to drive?',
      error: 'Sorry, there was an error. Please try again.',
      sending: 'Sending...',
      sent: 'Inquiry sent!',
      confirmSend: 'Would you like to send the inquiry?',
      yes: 'Yes, send',
      no: 'No, continue editing',
      endPrompt: 'How would you like to continue?',
      endChat: 'End chat',
      newInquiry: 'Discuss new inquiry'
    },
    fr: {
      title: 'Alex - Conseiller AKIM',
      subtitle: 'Votre expert en réducteurs',
      placeholder: 'Votre message...',
      send: 'Envoyer',
      close: 'Fermer',
      minimize: 'Minimiser',
      greeting: 'Bonjour! Je suis Alex, votre conseiller personnel chez AKIM. Je serai heureux de vous aider à choisir le bon réducteur. Qu\'est-ce que vous souhaitez entraîner?',
      error: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
      sending: 'Envoi en cours...',
      sent: 'Demande envoyée!',
      confirmSend: 'Voulez-vous envoyer la demande?',
      yes: 'Oui, envoyer',
      no: 'Non, continuer',
      endPrompt: 'Comment souhaitez-vous continuer?',
      endChat: 'Terminer le chat',
      newInquiry: 'Nouvelle demande'
    },
    it: {
      title: 'Alex - Consulente AKIM',
      subtitle: 'Il suo esperto di riduttori',
      placeholder: 'Il suo messaggio...',
      send: 'Invia',
      close: 'Chiudi',
      minimize: 'Minimizza',
      greeting: 'Buongiorno! Sono Alex, il suo consulente personale presso AKIM. Sarò lieto di aiutarla a scegliere il riduttore giusto. Cosa desidera azionare?',
      error: 'Mi dispiace, si è verificato un errore. Per favore riprovi.',
      sending: 'Invio in corso...',
      sent: 'Richiesta inviata!',
      confirmSend: 'Vuole inviare la richiesta?',
      yes: 'Sì, invia',
      no: 'No, continua',
      endPrompt: 'Come desidera procedere?',
      endChat: 'Termina chat',
      newInquiry: 'Nuova richiesta'
    }
  };

  // Text abrufen
  function t(key) {
    return i18n[state.language]?.[key] || i18n.de[key] || key;
  }

  // Widget HTML erstellen
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'akim-chatbot';
    widget.innerHTML = `
      <button class="akim-chat-button" aria-label="Chat öffnen">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l4.93-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm0-8h2v6h-2V8z"/>
        </svg>
        <span class="akim-chat-badge" style="display: none;">1</span>
      </button>

      <div class="akim-chat-window" style="display: none;">
        <div class="akim-chat-header">
          <div class="akim-chat-header-info">
            <img src="assets/images/Akim_Signet_2014_email.jpg" alt="AKIM" class="akim-chat-logo">
            <div>
              <h3>${t('title')}</h3>
              <p>${t('subtitle')}</p>
            </div>
          </div>
          <div class="akim-chat-header-actions">
            <select class="akim-lang-select" aria-label="Sprache wählen">
              <option value="de">DE</option>
              <option value="en">EN</option>
              <option value="fr">FR</option>
              <option value="it">IT</option>
            </select>
            <button class="akim-chat-minimize" aria-label="${t('minimize')}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
            </button>
            <button class="akim-chat-close" aria-label="${t('close')}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>

        <div class="akim-chat-messages" role="log" aria-live="polite">
          <!-- Nachrichten werden hier eingefügt -->
        </div>

        <div class="akim-chat-input-area">
          <form class="akim-chat-form">
            <input type="text"
                   class="akim-chat-input"
                   placeholder="${t('placeholder')}"
                   aria-label="${t('placeholder')}"
                   autocomplete="off">
            <button type="submit" class="akim-chat-send" aria-label="${t('send')}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    return widget;
  }

  // Event Listeners einrichten
  function setupEventListeners(widget) {
    const chatButton = widget.querySelector('.akim-chat-button');
    const chatWindow = widget.querySelector('.akim-chat-window');
    const closeBtn = widget.querySelector('.akim-chat-close');
    const minimizeBtn = widget.querySelector('.akim-chat-minimize');
    const form = widget.querySelector('.akim-chat-form');
    const input = widget.querySelector('.akim-chat-input');
    const langSelect = widget.querySelector('.akim-lang-select');

    // Chat öffnen/schliessen (NUR über Buttons, nicht durch Klick auf Overlay)
    chatButton.addEventListener('click', () => toggleChat(true));
    closeBtn.addEventListener('click', () => toggleChat(false));
    minimizeBtn.addEventListener('click', () => toggleChat(false));

    // Nachricht senden
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (message && !state.isLoading) {
        sendMessage(message);
        input.value = '';
      }
    });

    // Sprache wechseln (nur wenn noch nicht gesperrt)
    langSelect.addEventListener('change', (e) => {
      if (state.languageLocked) {
        // Zurücksetzen auf gesperrte Sprache
        e.target.value = state.language;
        return;
      }
      state.language = e.target.value;
      updateUILanguage();
    });

    // Enter zum Senden
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  // Chat ein-/ausblenden
  function toggleChat(open) {
    const widget = document.getElementById('akim-chatbot');
    const chatWindow = widget.querySelector('.akim-chat-window');
    const chatButton = widget.querySelector('.akim-chat-button');
    const badge = widget.querySelector('.akim-chat-badge');

    // Debug-Logging um unerwartetes Schliessen zu diagnostizieren
    if (!open && state.isOpen) {
      console.log('Chat wird geschlossen. Stack trace:', new Error().stack);
    }

    state.isOpen = open;

    if (open) {
      widget.classList.add('akim-chat-open');
      chatWindow.style.display = 'flex';
      chatButton.style.display = 'none';
      badge.style.display = 'none';

      // Begrüssung beim ersten Öffnen - NUR wenn keine Lead-Daten vorhanden
      // (bei Lead-Daten wird die personalisierte Begrüssung in openWithLead hinzugefügt)
      if (state.messages.length === 0 && !state.leadData) {
        addMessage(t('greeting'), 'assistant');
      }

      // Fokus auf Input
      setTimeout(() => {
        widget.querySelector('.akim-chat-input').focus();
      }, 100);
    } else {
      widget.classList.remove('akim-chat-open');
      chatWindow.style.display = 'none';
      // Button nur anzeigen wenn kein Lead-Formular benötigt
      if (!CONFIG.requireLeadForm) {
        chatButton.style.display = 'flex';
      }
    }
  }

  // Nachricht hinzufügen
  function addMessage(content, role) {
    const message = { role, content, timestamp: new Date() };
    state.messages.push(message);

    const messagesContainer = document.querySelector('.akim-chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `akim-chat-message akim-chat-message-${role}`;
    messageEl.innerHTML = `
      <div class="akim-chat-message-content">${escapeHtml(content)}</div>
      <div class="akim-chat-message-time">${formatTime(message.timestamp)}</div>
    `;
    messagesContainer.appendChild(messageEl);

    // Scrollen
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Typing-Indikator anzeigen
  function showTyping() {
    const messagesContainer = document.querySelector('.akim-chat-messages');
    const typingEl = document.createElement('div');
    typingEl.className = 'akim-chat-typing';
    typingEl.id = 'akim-typing';
    typingEl.innerHTML = `
      <div class="akim-typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Typing-Indikator entfernen
  function hideTyping() {
    const typingEl = document.getElementById('akim-typing');
    if (typingEl) typingEl.remove();
  }

  // Sprachauswahl sperren (nach erster User-Nachricht)
  function lockLanguageSelect() {
    const langSelect = document.querySelector('.akim-lang-select');
    if (langSelect) {
      langSelect.disabled = true;
      langSelect.style.opacity = '0.5';
      langSelect.style.cursor = 'not-allowed';
      langSelect.title = state.language === 'de' ? 'Sprache ist für diese Session gesperrt' :
                         state.language === 'en' ? 'Language is locked for this session' :
                         state.language === 'fr' ? 'Langue verrouillée pour cette session' :
                         'Lingua bloccata per questa sessione';
    }
  }

  // Nachricht an API senden
  async function sendMessage(content) {
    // Benutzer-Nachricht anzeigen
    addMessage(content, 'user');

    // Sprache nach erster User-Nachricht sperren
    if (!state.languageLocked) {
      state.languageLocked = true;
      lockLanguageSelect();
    }

    state.isLoading = true;
    showTyping();

    try {
      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          sessionId: state.sessionId,
          leadData: state.leadData,
          language: state.language
        })
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();

      hideTyping();

      // Session ID speichern
      if (data.sessionId) {
        state.sessionId = data.sessionId;
      }

      // Antwort anzeigen
      addMessage(data.message, 'assistant');

      // Prüfen ob Anfrage komplett
      if (data.isComplete) {
        showCompletionPrompt();
      }

    } catch (error) {
      console.error('Chat error:', error);
      hideTyping();
      addMessage(t('error'), 'assistant');
    } finally {
      state.isLoading = false;
    }
  }

  // Abschluss-Dialog anzeigen
  function showCompletionPrompt() {
    const messagesContainer = document.querySelector('.akim-chat-messages');
    const promptEl = document.createElement('div');
    promptEl.className = 'akim-chat-completion';
    promptEl.innerHTML = `
      <p>${t('confirmSend')}</p>
      <div class="akim-chat-completion-buttons">
        <button class="akim-btn-primary" data-action="send">${t('yes')}</button>
        <button class="akim-btn-secondary" data-action="continue">${t('no')}</button>
      </div>
    `;

    const sendBtn = promptEl.querySelector('[data-action="send"]');
    sendBtn.addEventListener('click', () => {
      // Button deaktivieren um Mehrfachklicks zu verhindern
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span class="akim-spinner"></span> ' + t('sending');
      submitInquiry();
    });
    promptEl.querySelector('[data-action="continue"]').addEventListener('click', () => {
      promptEl.remove();
    });

    messagesContainer.appendChild(promptEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Anfrage absenden
  async function submitInquiry() {
    const completionEl = document.querySelector('.akim-chat-completion');
    if (completionEl) {
      completionEl.innerHTML = `<p>${t('sending')}</p>`;
    }

    try {
      // Daten aus Konversation extrahieren
      const inquiry = extractInquiryData();

      // Zusammenfassung generieren lassen
      const summary = await generateSummary();

      // In Datenbank speichern
      const saveResponse = await fetch(CONFIG.saveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          leadData: state.leadData,
          messages: state.messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          })),
          summary: summary,
          language: state.language,
          technicalData: inquiry
        })
      });

      if (!saveResponse.ok) {
        console.error('Failed to save inquiry to database');
      }

      // Lead-Daten mit extrahierten Inquiry-Daten zusammenführen
      const fullInquiry = {
        ...inquiry,
        // Lead-Daten haben Priorität (wurden im Formular eingegeben)
        name: state.leadData?.name || inquiry.name,
        email: state.leadData?.email || inquiry.email,
        phone: state.leadData?.phone || inquiry.phone,
        company: state.leadData?.company || inquiry.company,
        country: state.leadData?.country || inquiry.country
      };

      // E-Mail an Verkauf senden (bestehender Endpunkt)
      const response = await fetch(CONFIG.sendEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry: fullInquiry,
          conversation: state.messages,
          language: state.language
        })
      });

      if (!response.ok) throw new Error('Send error');

      if (completionEl) {
        completionEl.innerHTML = `<p class="akim-success">${t('sent')}</p>`;
      }

      // Erfolgsmeldung vom Bot
      setTimeout(() => {
        if (completionEl) completionEl.remove();
        const successMessages = {
          de: 'Vielen Dank! Ihre Anfrage wurde an unser Verkaufsteam gesendet. Sie erhalten innerhalb von 2 Arbeitstagen eine Offerte per E-Mail.',
          en: 'Thank you! Your inquiry has been sent to our sales team. You will receive a quote by email within 2 business days.',
          fr: 'Merci! Votre demande a été envoyée à notre équipe commerciale. Vous recevrez un devis par email dans les 2 jours ouvrables.',
          it: 'Grazie! La sua richiesta è stata inviata al nostro team di vendita. Riceverà un preventivo via email entro 2 giorni lavorativi.'
        };
        addMessage(successMessages[state.language] || successMessages.de, 'assistant');

        // End-Popup nach kurzer Verzögerung anzeigen
        setTimeout(() => {
          showEndPrompt();
        }, 1500);
      }, 1500);

    } catch (error) {
      console.error('Submit error:', error);
      if (completionEl) {
        completionEl.innerHTML = `<p class="akim-error">${t('error')}</p>`;
      }
    }
  }

  // Zusammenfassung vom Backend generieren lassen
  async function generateSummary() {
    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          leadData: state.leadData,
          language: state.language
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.summary;
      }
    } catch (error) {
      console.error('Summary generation failed:', error);
    }
    return null;
  }

  // End-Dialog anzeigen (Chat beenden oder neue Anfrage)
  function showEndPrompt() {
    const messagesContainer = document.querySelector('.akim-chat-messages');
    const promptEl = document.createElement('div');
    promptEl.className = 'akim-chat-completion akim-chat-end-prompt';
    promptEl.innerHTML = `
      <p>${t('endPrompt')}</p>
      <div class="akim-chat-completion-buttons">
        <button class="akim-btn-secondary" data-action="end">${t('endChat')}</button>
        <button class="akim-btn-primary" data-action="new">${t('newInquiry')}</button>
      </div>
    `;

    promptEl.querySelector('[data-action="end"]').addEventListener('click', () => {
      promptEl.remove();
      toggleChat(false);
    });

    promptEl.querySelector('[data-action="new"]').addEventListener('click', () => {
      promptEl.remove();
      // Chat zurücksetzen für neue Anfrage
      state.messages = [];
      const messagesEl = document.querySelector('.akim-chat-messages');
      messagesEl.innerHTML = '';
      // Neue Begrüssung
      const newInquiryGreeting = {
        de: 'Gerne! Was für ein Getriebe benötigen Sie für Ihre nächste Anwendung?',
        en: 'Sure! What kind of gearbox do you need for your next application?',
        fr: 'Bien sûr! Quel type de réducteur avez-vous besoin pour votre prochaine application?',
        it: 'Certamente! Che tipo di riduttore le serve per la sua prossima applicazione?'
      };
      addMessage(newInquiryGreeting[state.language] || newInquiryGreeting.de, 'assistant');
    });

    messagesContainer.appendChild(promptEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Anfragedaten aus Konversation extrahieren
  function extractInquiryData() {
    const allText = state.messages.map(m => m.content).join('\n');

    // E-Mail extrahieren
    const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    // Firma extrahieren (verschiedene Patterns)
    const companyMatch = allText.match(/(?:firma|company|société|azienda)[:\s]+([^\n,]+)/i);

    // Name extrahieren
    const nameMatch = allText.match(/(?:name|nom|nome)[:\s]+([^\n,]+)/i);

    // Telefon extrahieren
    const phoneMatch = allText.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/);

    // Technische Daten
    const torqueMatch = allText.match(/(\d+(?:[.,]\d+)?)\s*(?:nm|newtonmeter)/i);
    const speedMatch = allText.match(/(\d+(?:[.,]\d+)?)\s*(?:min⁻¹|min-1|1\/min|rpm|u\/min)/i);
    const ratioMatch = allText.match(/(?:übersetzung|ratio|rapport|rapporto)[:\s]*(\d+(?:[.,]\d+)?)\s*:\s*1/i);

    return {
      email: emailMatch ? emailMatch[0] : null,
      company: companyMatch ? companyMatch[1].trim() : null,
      name: nameMatch ? nameMatch[1].trim() : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      outputTorque: torqueMatch ? torqueMatch[1] : null,
      outputSpeed: speedMatch ? speedMatch[1] : null,
      ratio: ratioMatch ? ratioMatch[1] : null,
      // Weitere Felder können bei Bedarf ergänzt werden
      application: extractField(allText, ['anwendung', 'application', 'applicazione']),
      driveType: extractField(allText, ['antrieb', 'motor', 'drive', 'moteur']),
      country: extractField(allText, ['land', 'country', 'pays', 'paese'])
    };
  }

  // Feld aus Text extrahieren
  function extractField(text, keywords) {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]+([^\\n,]+)`, 'i');
      const match = text.match(regex);
      if (match) return match[1].trim();
    }
    return null;
  }

  // UI-Sprache aktualisieren
  function updateUILanguage() {
    const widget = document.getElementById('akim-chatbot');
    widget.querySelector('.akim-chat-header h3').textContent = t('title');
    widget.querySelector('.akim-chat-header p').textContent = t('subtitle');
    widget.querySelector('.akim-chat-input').placeholder = t('placeholder');

    // Begrüssung aktualisieren wenn nur die initiale Nachricht vorhanden ist
    // (Nur wenn der Nutzer noch nichts geschrieben hat)
    if (state.messages.length === 1 && state.messages[0].role === 'assistant') {
      const messagesContainer = document.querySelector('.akim-chat-messages');
      messagesContainer.innerHTML = '';
      state.messages = [];

      // Neue Begrüssung in gewählter Sprache
      if (state.leadData) {
        // Personalisierte Begrüssung mit Lead-Daten
        const greetings = {
          de: `Guten Tag${state.leadData.name ? ' ' + state.leadData.name.split(' ')[0] : ''}! Ich bin Alex, Ihr persönlicher Berater bei AKIM.${state.leadData.company ? ' Ich sehe, Sie kommen von ' + state.leadData.company + '.' : ''} Wie kann ich Ihnen bei der Auswahl des passenden Getriebes helfen? Was möchten Sie antreiben?`,
          en: `Hello${state.leadData.name ? ' ' + state.leadData.name.split(' ')[0] : ''}! I'm Alex, your personal advisor at AKIM.${state.leadData.company ? ' I see you\'re from ' + state.leadData.company + '.' : ''} How can I help you select the right gearbox? What do you want to drive?`,
          fr: `Bonjour${state.leadData.name ? ' ' + state.leadData.name.split(' ')[0] : ''}! Je suis Alex, votre conseiller personnel chez AKIM.${state.leadData.company ? ' Je vois que vous venez de ' + state.leadData.company + '.' : ''} Comment puis-je vous aider à choisir le bon réducteur? Qu'est-ce que vous souhaitez entraîner?`,
          it: `Buongiorno${state.leadData.name ? ' ' + state.leadData.name.split(' ')[0] : ''}! Sono Alex, il suo consulente personale presso AKIM.${state.leadData.company ? ' Vedo che viene da ' + state.leadData.company + '.' : ''} Come posso aiutarla a scegliere il riduttore giusto? Cosa desidera azionare?`
        };
        addMessage(greetings[state.language] || greetings.de, 'assistant');
      } else {
        // Standard-Begrüssung
        addMessage(t('greeting'), 'assistant');
      }
    }
  }

  // Hilfsfunktionen
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(date) {
    return date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  }

  // Browser-Sprache erkennen
  function detectBrowserLanguage() {
    const lang = navigator.language?.substring(0, 2).toLowerCase();
    return ['de', 'en', 'fr', 'it'].includes(lang) ? lang : 'de';
  }

  // Chatbot öffnen mit Lead-Daten
  function openWithLead(leadData) {
    state.leadData = leadData;

    // Sprache basierend auf Land setzen
    const countryLangMap = {
      'CH': 'de', 'DE': 'de', 'AT': 'de',
      'FR': 'fr', 'BE': 'fr',
      'IT': 'it',
      'UK': 'en', 'US': 'en', 'OTHER': 'en'
    };
    state.language = countryLangMap[leadData.country] || 'de';

    const widget = document.getElementById('akim-chatbot');
    if (widget) {
      widget.querySelector('.akim-lang-select').value = state.language;
      updateUILanguage();
    }

    // Chat öffnen
    toggleChat(true);

    // Personalisierte Begrüssung
    if (state.messages.length === 0) {
      const greetings = {
        de: `Guten Tag${leadData.name ? ' ' + leadData.name.split(' ')[0] : ''}! Ich bin Alex, Ihr persönlicher Berater bei AKIM.${leadData.company ? ' Ich sehe, Sie kommen von ' + leadData.company + '.' : ''} Wie kann ich Ihnen bei der Auswahl des passenden Getriebes helfen? Was möchten Sie antreiben?`,
        en: `Hello${leadData.name ? ' ' + leadData.name.split(' ')[0] : ''}! I'm Alex, your personal advisor at AKIM.${leadData.company ? ' I see you\'re from ' + leadData.company + '.' : ''} How can I help you select the right gearbox? What do you want to drive?`,
        fr: `Bonjour${leadData.name ? ' ' + leadData.name.split(' ')[0] : ''}! Je suis Alex, votre conseiller personnel chez AKIM.${leadData.company ? ' Je vois que vous venez de ' + leadData.company + '.' : ''} Comment puis-je vous aider à choisir le bon réducteur? Qu'est-ce que vous souhaitez entraîner?`,
        it: `Buongiorno${leadData.name ? ' ' + leadData.name.split(' ')[0] : ''}! Sono Alex, il suo consulente personale presso AKIM.${leadData.company ? ' Vedo che viene da ' + leadData.company + '.' : ''} Come posso aiutarla a scegliere il riduttore giusto? Cosa desidera azionare?`
      };
      addMessage(greetings[state.language] || greetings.de, 'assistant');
    }
  }

  // Initialisierung
  function init() {
    // Sprache setzen
    state.language = detectBrowserLanguage();

    // Widget erstellen
    const widget = createWidget();

    // Sprachauswahl setzen
    widget.querySelector('.akim-lang-select').value = state.language;

    // Events einrichten
    setupEventListeners(widget);

    // Chat-Button verstecken wenn Lead-Formular benötigt
    if (CONFIG.requireLeadForm) {
      const chatButton = widget.querySelector('.akim-chat-button');
      if (chatButton) {
        chatButton.style.display = 'none';
      }
    }

    // Event Listener für Lead-Formular
    window.addEventListener('akim-open-chat', function(e) {
      openWithLead(e.detail);
    });

    // Globale API exponieren
    window.akimChatbot = {
      open: function() { toggleChat(true); },
      close: function() { toggleChat(false); },
      openWithLead: openWithLead
    };

    console.log('AKIM Chatbot initialized');
  }

  // Starten wenn DOM bereit
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
