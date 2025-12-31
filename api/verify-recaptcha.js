// AKIM reCAPTCHA Verification API - Vercel Serverless Function
// Verifiziert reCAPTCHA Token beim Chat-Start

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
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'Token required' });
      return;
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      // Wenn kein Secret Key konfiguriert, durchlassen
      console.warn('RECAPTCHA_SECRET_KEY not configured, allowing request');
      res.status(200).json({ success: true, score: 1 });
      return;
    }

    // Token bei Google verifizieren
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`
    });

    const data = await response.json();

    if (!data.success) {
      console.log('reCAPTCHA verification failed:', data['error-codes']);
      res.status(200).json({
        success: false,
        error: 'Verification failed'
      });
      return;
    }

    // Score prüfen (0.0 = Bot, 1.0 = Mensch)
    const score = data.score || 0;
    const isHuman = score >= 0.3;

    if (!isHuman) {
      console.log(`reCAPTCHA blocked: score=${score}`);
    }

    res.status(200).json({
      success: isHuman,
      score: score
    });

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    res.status(500).json({ success: false, error: 'Verification error' });
  }
};
