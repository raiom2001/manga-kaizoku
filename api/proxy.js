const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Extrai o caminho da API a partir do req.url
  const raw = req.url;
  const withoutPrefix = raw.replace(/^\/api\/proxy/, '');
  const qmark = withoutPrefix.indexOf('?');
  const apiPath = qmark === -1 ? withoutPrefix : withoutPrefix.slice(0, qmark);

  // Usa req.query (parsed pelo runtime da Vercel) para evitar problemas com [] na URL
  // filtrando o parâmetro "path" que vem do rewrite :path*
  const parts = [];
  const query = req.query || {};
  for (const k of Object.keys(query)) {
    if (k === 'path') continue;
    const val = query[k];
    const vals = Array.isArray(val) ? val : [val];
    // Preserva notação [] para parâmetros de array
    const key = k.endsWith('[]') ? k : vals.length > 1 ? k + '[]' : k;
    vals.forEach(v => parts.push(key + '=' + encodeURIComponent(v)));
  }
  const qs = parts.join('&');

  const target = 'https://api.mangadex.org' + apiPath + (qs ? '?' + qs : '');
  console.log('[proxy]', target.slice(0, 150));

  https.get(target, {
    headers: { Accept: 'application/json', 'User-Agent': 'MangaKaizoku/1.0' }
  }, apiRes => {
    res.setHeader('Content-Type', 'application/json');
    res.status(apiRes.statusCode);
    apiRes.pipe(res);
  }).on('error', e => {
    res.status(502).json({ error: e.message });
  });
};
