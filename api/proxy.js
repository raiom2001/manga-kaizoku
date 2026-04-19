// Vercel Serverless Function — proxy para MangaDex
// Rota: /api/proxy?path=/manga&limit=12&...
const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Pega o path e os demais query params
  const url = new URL(req.url, 'http://localhost');
  const apiPath = url.searchParams.get('path') || '/manga';
  url.searchParams.delete('path');
  const qs = url.searchParams.toString();
  const target = `https://api.mangadex.org${apiPath}${qs ? '?' + qs : ''}`;

  const options = {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'MangaKaizoku/1.0 (vercel)',
    },
  };

  const proxy = https.get(target, options, (apiRes) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(apiRes.statusCode);
    apiRes.pipe(res);
  });

  proxy.on('error', (e) => {
    res.status(502).json({ error: e.message, target });
  });
};
