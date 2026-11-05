// Soxta Telegram Bot API (/bot<token>/<method>) va Mini App kirish ma'lumoti (initData) yasash — tests/miniapp.test.js, ui.test "Telegram Mini App"
const http = require('http');
const crypto = require('crypto');

function startFakeTelegram() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const method = req.url.split('/').pop();
      let data = {};
      try { data = body ? JSON.parse(body) : {}; } catch (e) { data = { raw: body }; }
      calls.push({ method, data });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, result: method === 'getMe' ? { id: 1, is_bot: true, username: 'cc_test_bot', supports_inline_queries: true } : {} }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    api: 'http://127.0.0.1:' + server.address().port, calls, stop: () => new Promise((r) => server.close(r))
  })));
}

// Telegram'ning o'zi imzolagandek initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
function makeInitData(token, user, authDate) {
  const fields = { auth_date: String(authDate || Math.floor(Date.now() / 1000)), query_id: 'AAH' + user.id, user: JSON.stringify(user) };
  const check = Object.keys(fields).sort().map((k) => k + '=' + fields[k]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

module.exports = { startFakeTelegram, makeInitData };
