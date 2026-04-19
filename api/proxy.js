// Vercel Serverless Function — proxy para MangaDex
const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Pega o querystring RAW — preserva [] sem re-encodar
  const rawQs = req.url.includes('?') ? req.url.split('?')[1] : '';
  const params = new URLSearchParams(rawQs);
  const apiPath = params.get('path') || '/manga';
  params.delete('path');

  // Reconstrói querystring preservando [] literalmente
  const qs = params.toString().replace(/%5B%5D/g, '[]').replace(/%5B/g, '[').replace(/%5D/g, ']');
  const target = 'https://api.mangadex.org' + apiPath + (qs ? '?' + qs : '');

  console.log('[proxy]', target.slice(0, 120));

  const proxyReq = https.get(target, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'MangaKaizoku/1.0',
    },
  }, (apiRes) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(apiRes.statusCode);
    apiRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.status(502).json({ error: e.message, target });
  });
};
