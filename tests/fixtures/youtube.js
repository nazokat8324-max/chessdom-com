// Soxta YouTube: kanal RSS lentasi va video muqovalari (tests/videos.test.js, ui.test "Videodarslar")
const http = require('http');

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>ChessCaravan</title>
 <entry>
  <yt:videoId>axHTEebW8xo</yt:videoId>
  <title>Shaxmat qayerda paydo bo&#39;lgan? Shaxmat tarixi #1 #shorts</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/axHTEebW8xo"/>
  <published>2026-11-02T08:31:47+00:00</published>
  <media:group><media:title>Shaxmat qayerda paydo bo&#39;lgan? Shaxmat tarixi #1 #shorts</media:title><media:community><media:statistics views="46"/></media:community></media:group>
 </entry>
 <entry>
  <yt:videoId>KTc2AAnXWlU</yt:videoId>
  <title>Shaxmat &amp; Futbol</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=KTc2AAnXWlU"/>
  <published>2026-11-01T14:00:37+00:00</published>
  <media:group><media:title>Shaxmat &amp; Futbol</media:title><media:community><media:statistics views="1157"/></media:community></media:group>
 </entry>
 <entry>
  <yt:videoId>bad id!</yt:videoId>
  <media:group><media:title>Noto'g'ri yozuv</media:title></media:group>
 </entry>
</feed>`;
// 1×1 JPEG
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');

function startFakeYoutube() {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    if (req.url.startsWith('/feeds/videos.xml')) { res.setHeader('content-type', 'application/atom+xml'); return res.end(FEED); }
    const m = req.url.match(/^\/vi\/([\w-]{11})\/hqdefault\.jpg$/);
    if (m) { res.setHeader('content-type', 'image/jpeg'); return res.end(JPEG); }
    res.statusCode = 404; res.end();
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const base = 'http://127.0.0.1:' + server.address().port;
    resolve({ base, hits, stop: () => new Promise((r) => server.close(r)) });
  }));
}

module.exports = { startFakeYoutube, JPEG };
