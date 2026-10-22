// Email yuborish (parolni tiklash xatlari) — Brevo HTTP API orqali (SMTP port shart emas).
// Render env: BREVO_API_KEY, MAIL_FROM (Brevo'da tasdiqlangan jo'natuvchi email), ixtiyoriy APP_URL.
// Lokal sinov uchun MAIL_LOG=1 — xat yuborilmaydi, havola konsolga yoziladi.

function isConfigured() {
  return !!((process.env.BREVO_API_KEY && process.env.MAIL_FROM) || process.env.MAIL_LOG);
}

async function sendMail({ to, subject, html, text }) {
  if (process.env.MAIL_LOG && !process.env.BREVO_API_KEY) {
    console.log(`[MAIL] ${to} | ${subject}\n${text}`);
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: 'ChessCaravan' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text
    })
  });
  if (!res.ok) throw new Error('Brevo ' + res.status + ': ' + (await res.text()).slice(0, 200));
}

module.exports = { isConfigured, sendMail };
