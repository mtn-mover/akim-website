# AKIM Website & Chatbot - Projektstatus

**Stand:** Januar 2026
**Domain:** chat.akim.ch / akim.ch
**Hosting:** Vercel
**Datenbank:** Neon PostgreSQL

---

## Implementierte Features

### 1. Chatbot (chat.akim.ch)
- Mehrsprachiger Chatbot (DE/EN/FR) für Getriebe-Anfragen
- RAG-basierte Produktsuche mit Vektorembeddings
- Lead-Erfassung mit Kontaktformular
- Session-Tracking mit technischen Daten (Browser, Timezone, Referrer)

### 2. Admin-Bereich (/admin.html)
- **Multi-User Login** mit 3 Benutzerrollen:
  - `admin` - Vollzugriff inkl. Löschen
  - `sales` - Anfragen verwalten
  - `engineering` - Anfragen verwalten
- Session-basierte Authentifizierung (HMAC-SHA256, 24h gültig)
- Anfragen-Übersicht mit Filterung nach Status
- Detail-Ansicht mit Chat-Verlauf
- Status-Verwaltung (Neu/In Bearbeitung/Erledigt)
- Interne Notizen
- **Löschfunktion** (nur Admin)
- Toast-Benachrichtigungen (INP-optimiert)

### 3. RAG-Produkte (/rag-admin.html)
- Produktverwaltung für Chatbot-Wissensbasis
- CSV-Import für Massenimport
- Vektorembeddings für semantische Suche

### 4. E-Mail-System
- **Resend API** für transaktionale E-Mails
- **Team-Benachrichtigung** an help@akim.ch bei neuer Anfrage
- **Kundenbestätigung** (mehrsprachig DE/EN/FR)
  - Dankesnachricht
  - Bestätigung der Speicherung
  - Kontaktdaten für Rückfragen

---

## Technische Architektur

### API-Endpunkte (Vercel Serverless Functions)

| Endpunkt | Beschreibung |
|----------|--------------|
| `/api/auth` | Login & Token-Validierung |
| `/api/inquiries` | Anfragen abrufen (GET) |
| `/api/save-inquiry` | Neue Anfrage speichern |
| `/api/send-inquiry` | E-Mail-Versand (Team + Kunde) |
| `/api/update-inquiry` | Status/Notizen aktualisieren, Löschen |
| `/api/rag-products` | RAG-Produktverwaltung |
| `/api/chat` | Chatbot-Konversation |
| `/api/cors` | CORS-Konfiguration |

### Datenbank-Schema (PostgreSQL)

```sql
-- Anfragen-Tabelle
CREATE TABLE inquiries (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_company VARCHAR(255),
  customer_country VARCHAR(100),
  language VARCHAR(10),
  messages JSONB,
  summary TEXT,
  technical_data JSONB,
  browser_language VARCHAR(20),
  timezone VARCHAR(100),
  referrer TEXT,
  form_timestamp TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  assigned_to VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- RAG-Produkte (separate Tabelle)
-- Siehe rag-admin.html für Schema
```

### Environment Variables (Vercel)

```env
# Datenbank
POSTGRES_URL=postgresql://...

# E-Mail (Resend)
RESEND_API_KEY=re_...
NOTIFICATION_EMAIL=help@akim.ch  # Optional, Default: help@akim.ch

# Authentifizierung
ADMIN_PASSWORD=***
SALES_PASSWORD=***
ENGINEERING_PASSWORD=***
ADMIN_SESSION_SECRET=***  # Optional, für Token-Signierung

# OpenAI (für Chatbot)
OPENAI_API_KEY=sk-...
```

### DNS-Konfiguration (akim.ch)

Für E-Mail-Versand via Resend:

```dns
# SPF Record
@ TXT "v=spf1 include:_spf.google.com include:_spf.resend.com -all"

# DKIM Record
resend._domainkey CNAME ...  # Von Resend bereitgestellt
```

---

## Kontaktdaten in E-Mails

**Korrekte Adresse (in allen Kunden-E-Mails):**
```
AKIM AG
Breitenstrasse 16
CH-8852 Altendorf

Tel: +41 55 451 85 00
E-Mail: sales@akim.ch
Web: www.akim.ch
```

---

## Offene Punkte / Mögliche Erweiterungen

- [ ] Dashboard mit Statistiken (Anfragen pro Tag/Woche)
- [ ] E-Mail-Templates anpassen (Branding, Logo)
- [ ] Automatische Zuweisung an Benutzer
- [ ] Export-Funktion (CSV/Excel)
- [ ] Webhook-Integration für CRM

---

## Dateien-Übersicht

```
akim-website/
├── admin.html          # Anfragen-Verwaltung
├── login.html          # Multi-User Login
├── rag-admin.html      # RAG-Produktverwaltung
├── api/
│   ├── auth.js         # Authentifizierung
│   ├── cors.js         # CORS-Konfiguration
│   ├── inquiries.js    # Anfragen abrufen
│   ├── save-inquiry.js # Anfrage speichern
│   ├── send-inquiry.js # E-Mail-Versand
│   ├── update-inquiry.js # Update/Delete
│   ├── rag-products.js # RAG-Verwaltung
│   └── chat.js         # Chatbot-API
└── images/
    └── logo_akim_neu2.png
```

---

## Letzte Änderungen

1. Multi-User Login implementiert (admin, sales, engineering)
2. Löschfunktion für Anfragen (nur Admin)
3. INP-Performance optimiert (Toast statt confirm())
4. DNS für Resend konfiguriert (SPF/DKIM)
5. Kundenbestätigungs-E-Mail implementiert (DE/EN/FR)
6. Kontaktdaten korrigiert (Altendorf statt Volketswil)
