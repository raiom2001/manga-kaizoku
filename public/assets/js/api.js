/* MangaKaizoku — api.js */
const API = (() => {
  const IMG_BASE = 'https://uploads.mangadex.org';

  // Detecta ambiente automaticamente:
  // - localhost/192.168.x.x → proxy Node local :3001
  // - qualquer outro (Vercel, produção) → Vercel serverless /api/proxy
  function getProxyBase() {
    const h = location.hostname;
    const isLocal = h === 'localhost' || h.startsWith('192.168.') || h.startsWith('10.') || h === '127.0.0.1';
    return isLocal ? 'http://localhost:3001/api' : '/api/proxy';
  }

  // Monta URL sem encodeURIComponent nas chaves — preserva [] literalmente
  function buildUrl(path, params) {
    const parts = [];
    Object.entries(params || {}).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        const key = k.endsWith('[]') ? k : k + '[]';
        v.forEach(val => parts.push(key + '=' + encodeURIComponent(val)));
      } else if (v !== undefined && v !== null && v !== '') {
        parts.push(k + '=' + encodeURIComponent(v));
      }
    });
    return path + (parts.length ? '?' + parts.join('&') : '');
  }

  async function request(path, params) {
    const base = getProxyBase();
    const isLocal = base.includes('3001');
    let url;

    if (isLocal) {
      // proxy local: chama /api/manga?...
      url = base + buildUrl(path, params);
    } else {
      // Vercel function: /api/proxy?path=/manga&limit=12&...
      const qp = { path };
      // Adiciona todos os params ao querystring
      const parts = ['path=' + encodeURIComponent(path)];
      Object.entries(params || {}).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          const key = k.endsWith('[]') ? k : k + '[]';
          v.forEach(val => parts.push(key + '=' + encodeURIComponent(val)));
        } else if (v !== undefined && v !== null && v !== '') {
          parts.push(k + '=' + encodeURIComponent(v));
        }
      });
      url = base + '?' + parts.join('&');
    }

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('API ' + res.status);
    return res.json();
  }

  function coverUrl(mangaId, filename) {
    if (!filename) return '';
    return IMG_BASE + '/covers/' + mangaId + '/' + filename + '.256.jpg';
  }

  function extractCoverFilename(manga) {
    const cov = (manga.relationships || []).find(r => r.type === 'cover_art');
    return (cov && cov.attributes && cov.attributes.fileName) ? cov.attributes.fileName : null;
  }

  function extractAuthor(manga) {
    const a = (manga.relationships || []).find(r => r.type === 'author');
    return (a && a.attributes && a.attributes.name) ? a.attributes.name : '';
  }

  function extractTitle(manga) {
    const t = manga.attributes.title || {};
    const v = t['pt-br'] || t['pt'] || t['en'] || Object.values(t)[0];
    if (v) return v;
    for (const alt of (manga.attributes.altTitles || [])) {
      const w = alt['pt-br'] || alt['pt'] || alt['en'];
      if (w) return w;
    }
    return 'Sem titulo';
  }

  function extractDesc(manga) {
    const d = manga.attributes.description || {};
    return d['pt-br'] || d['pt'] || d['en'] || Object.values(d)[0] || '';
  }

  function extractTags(manga) {
    return (manga.attributes.tags || []).map(tag => {
      const n = tag.attributes.name;
      return n['pt-br'] || n['pt'] || n['en'] || Object.values(n)[0] || '';
    }).filter(Boolean);
  }

  function normalizeManga(manga) {
    const filename = extractCoverFilename(manga);
    const covRel = (manga.relationships || []).find(r => r.type === 'cover_art');
    return {
      id: manga.id,
      title: extractTitle(manga),
      author: extractAuthor(manga),
      description: extractDesc(manga),
      tags: extractTags(manga),
      status: manga.attributes.status || '',
      year: manga.attributes.year || null,
      coverId: covRel ? covRel.id : null,
      coverFilename: filename,
      coverUrl: filename ? coverUrl(manga.id, filename) : '',
    };
  }

  const INC = ['cover_art', 'author'];
  const RAT = ['safe', 'suggestive'];

  async function getMangaList(extra) {
    const data = await request('/manga', Object.assign({ limit: 20, 'includes[]': INC, 'contentRating[]': RAT }, extra || {}));
    return { data: (data.data || []).map(normalizeManga), total: data.total || 0, offset: data.offset || 0 };
  }

  function getPopular(n)         { return getMangaList({ limit: n || 12, 'order[followedCount]': 'desc' }); }
  function getRecentlyUpdated(n) { return getMangaList({ limit: n || 12, 'order[latestUploadedChapter]': 'desc' }); }
  function getTopRated(n)        { return getMangaList({ limit: n || 12, 'order[rating]': 'desc' }); }
  function searchManga(q, off)   { return getMangaList({ title: q, limit: 20, offset: off || 0, 'order[relevance]': 'desc' }); }

  async function getMangaDetail(id) {
    const data = await request('/manga/' + id, { 'includes[]': ['cover_art', 'author', 'artist'] });
    return normalizeManga(data.data);
  }

  async function getAvailableLanguages(mangaId) {
    try {
      const data = await request('/chapter', {
        manga: mangaId, limit: 100, 'order[chapter]': 'asc',
        'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
      });
      const langs = [...new Set((data.data || []).map(c => c.attributes.translatedLanguage).filter(Boolean))];
      return langs.length ? langs : ['en'];
    } catch (_) { return ['en']; }
  }

  async function getChapters(mangaId, lang, offset) {
    const data = await request('/chapter', {
      manga: mangaId,
      'translatedLanguage[]': [lang || 'pt-br'],
      'order[chapter]': 'desc',
      limit: 100, offset: offset || 0,
      'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
    });
    return {
      data: (data.data || []).map(ch => ({
        id: ch.id,
        chapter: ch.attributes.chapter,
        title: ch.attributes.title || '',
        lang: ch.attributes.translatedLanguage,
        pages: ch.attributes.pages,
        publishAt: ch.attributes.publishAt,
        externalUrl: ch.attributes.externalUrl || null,
        isExternal: !!ch.attributes.externalUrl,
      })),
      total: data.total || 0,
    };
  }

  async function getChapterPages(chapterId) {
    const data = await request('/at-home/server/' + chapterId);
    const { baseUrl, chapter } = data;
    return chapter.data.map(p => baseUrl + '/data/' + chapter.hash + '/' + p);
  }

  return { getMangaList, getPopular, getRecentlyUpdated, getTopRated,
           searchManga, getMangaDetail, getAvailableLanguages,
           getChapters, getChapterPages, coverUrl, normalizeManga };
})();
