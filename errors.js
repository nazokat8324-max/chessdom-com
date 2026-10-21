// 🐞 Brauzer xatolarini serverga yuborish (admin paneli → Xatolar). Boshqa skriptlardan oldin yuklanadi.
// Bir sahifada ko'pi bilan 10 ta, bir xil xato bir marta; kengaytmalar va "Script error." (begona domen) yuborilmaydi.
(function () {
  var sent = {}, count = 0;
  var IGNORE = /^Script error\.?$|ResizeObserver loop|^Load failed$|^NetworkError|Failed to fetch|chrome-extension:|moz-extension:|safari-extension:/i;

  function report(message, source, line, col, stack) {
    try {
      message = String(message || '').slice(0, 500);
      if (!message || IGNORE.test(message) || IGNORE.test(source || '') || IGNORE.test(stack || '')) return;
      var key = message + '|' + source + ':' + line;
      if (sent[key] || count >= 10) return;
      sent[key] = 1; count++;
      var headers = { 'Content-Type': 'application/json' };
      var token = null;
      try { token = localStorage.getItem('justChessAuthToken'); } catch (e) {}
      if (token) headers.Authorization = 'Bearer ' + token;
      fetch('/api/client-errors', {
        method: 'POST', headers: headers, keepalive: true,
        body: JSON.stringify({ message: message, source: source || '', line: line || 0, col: col || 0, stack: String(stack || '').slice(0, 4000), url: location.pathname + location.search })
      }).catch(function () {});
    } catch (e) {}
  }

  window.addEventListener('error', function (e) {
    // Rasm/skript yuklanmagani (target — element) emas, faqat JS xatolari
    if (!e || e.target !== window && e.target && e.target.tagName) return;
    report(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    if (!r) return;
    report(r.message || String(r), '', 0, 0, r.stack);
  });
  window.reportClientError = function (err, where) {
    if (!err) return;
    report((where ? where + ': ' : '') + (err.message || String(err)), '', 0, 0, err.stack);
  };
})();
