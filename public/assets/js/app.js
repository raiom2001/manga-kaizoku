/* MangaKaizoku — app.js */

// ── Theme ─────────────────────────────────────────────
const MOON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.outerHTML = `<span id="themeIcon">${theme === 'dark' ? MOON_SVG : SUN_SVG}</span>`;
}

function initTheme() {
  applyTheme(Store.getTheme());
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = Store.getTheme() === 'dark' ? 'light' : 'dark';
    Store.setTheme(next);
    applyTheme(next);
  });
}

// ── Scroll behavior ────────────────────────────────────
function initScrollBehavior() {
  let lastY = 0;
  const topbar    = document.getElementById('topbar');
  const bottombar = document.getElementById('bottombar');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const going = y > lastY && y > 80;
    topbar?.classList.toggle('hidden', going);
    bottombar?.classList.toggle('hidden', going);
    lastY = y;
  }, { passive: true });
}

// ── Home ───────────────────────────────────────────────
async function renderHome() {
  const app = document.getElementById('app');
  UI.updateNavActive('home');
  app.innerHTML = `
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow">Piratas &amp; Samurais</div>
        <h1 class="hero-title">Sua tripulacao de<br><span>mangas favoritos</span></h1>
        <p class="hero-sub">Explore milhares de obras. Do shonen ao seinen, do josei ao kodomomuke — navegue sem limites.</p>
      </div>
    </div>

    <div class="home-section">
      <div class="section-header">
        <h2 class="section-title">Populares</h2>
        <a href="#/search" class="section-link">Ver mais</a>
      </div>
      <div class="manga-grid" id="popularGrid">${UI.skeletonGrid(12)}</div>
    </div>
    <div class="home-section">
      <div class="section-header">
        <h2 class="section-title">Atualizados</h2>
        <a href="#/search" class="section-link">Ver mais</a>
      </div>
      <div class="manga-grid" id="updatedGrid">${UI.skeletonGrid(12)}</div>
    </div>
    <div class="home-section">
      <div class="section-header">
        <h2 class="section-title">Mais Avaliados</h2>
        <a href="#/search" class="section-link">Ver mais</a>
      </div>
      <div class="manga-grid" id="ratedGrid">${UI.skeletonGrid(12)}</div>
    </div>
  `;

  async function loadSection(fetchFn, gridId) {
    try {
      const result = await fetchFn(12);
      const grid = document.getElementById(gridId);
      if (!grid) return;
      grid.className = '';
      UI.mangaGrid(result.data, grid);
    } catch {
      const grid = document.getElementById(gridId);
      if (grid) grid.innerHTML = UI.errorState('Falha', 'Não foi possível carregar.', () => loadSection(fetchFn, gridId));
    }
  }

  await Promise.allSettled([
    loadSection(API.getPopular, 'popularGrid'),
    loadSection(API.getRecentlyUpdated, 'updatedGrid'),
    loadSection(API.getTopRated, 'ratedGrid'),
  ]);
}

// ── Search ─────────────────────────────────────────────
let searchTimeout = null;

async function renderSearch() {
  const app = document.getElementById('app');
  UI.updateNavActive('search');
  app.innerHTML = `
    <div class="page-header"><h1>Buscar</h1></div>
    <div class="search-bar-wrap">
      <span class="search-icon">${UI.SVG.search}</span>
      <input type="search" class="search-input" id="searchInput"
        placeholder="Título do mangá..." autocomplete="off" />
    </div>
    <div class="search-status" id="searchStatus"></div>
    <div id="searchResults"></div>
    <div id="searchPagination"></div>
  `;

  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => doSearch(input.value.trim(), 1), 420);
  });
  input.focus();
}

async function doSearch(query, page = 1) {
  const resultsEl    = document.getElementById('searchResults');
  const statusEl     = document.getElementById('searchStatus');
  const paginationEl = document.getElementById('searchPagination');
  if (!resultsEl) return;

  if (!query) {
    resultsEl.innerHTML = UI.emptyState('search', 'Digite algo para buscar', 'Encontre seus mangás favoritos.');
    if (statusEl) statusEl.textContent = '';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  resultsEl.innerHTML = `<div class="manga-grid">${UI.skeletonGrid(12)}</div>`;
  if (statusEl) statusEl.textContent = `Buscando por "${query}"...`;
  if (paginationEl) paginationEl.innerHTML = '';

  try {
    const offset = (page - 1) * 20;
    const result = await API.searchManga(query, offset);
    if (!document.getElementById('searchResults')) return;
    if (statusEl) statusEl.textContent = result.total ? `${result.total} resultado(s) para "${query}"` : '';
    UI.mangaGrid(result.data, resultsEl);
    if (paginationEl) paginationEl.innerHTML = UI.pagination(page, result.total, 20, p => doSearch(query, p));
  } catch {
    resultsEl.innerHTML = UI.errorState('Erro na busca', 'Não foi possível buscar.', () => doSearch(query, page));
    if (statusEl) statusEl.textContent = '';
  }
}

// ── Manga Detail ────────────────────────────────────────
async function renderMangaDetail({ id }) {
  const app = document.getElementById('app');
  UI.updateNavActive('');

  app.innerHTML = `
    <div class="detail-hero">
      <div class="skeleton-card" style="width:175px;height:263px;flex-shrink:0;border-radius:8px;">
        <div class="skeleton-cover" style="height:100%;"></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:12px;">
        <div class="skeleton-line" style="height:36px;width:65%;"></div>
        <div class="skeleton-line" style="height:14px;width:35%;"></div>
        <div class="skeleton-line" style="height:80px;width:100%;"></div>
      </div>
    </div>
  `;

  try {
    const manga    = await API.getMangaDetail(id);
    const isFav    = Store.isFavorite(id);
    const hist     = Store.getHistory();
    const lastRead = hist.find(h => h.mangaId === id);
    const prefLang = Store.getPrefLang();

    app.innerHTML = `
      <div class="detail-hero">
        <div class="detail-cover">
          <img src="${manga.coverUrl}" alt="${manga.title}" loading="lazy" width="175" height="263"
            referrerpolicy="no-referrer" onerror="this.style.display='none'" />
        </div>
        <div class="detail-info">
          <h1 class="detail-title">${manga.title}</h1>
          <div class="detail-author">${manga.author}</div>
          <div class="detail-tags">
            ${manga.tags.slice(0, 8).map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <p class="detail-desc" id="detailDesc">${manga.description || 'Sem descrição disponível.'}</p>
          <button class="read-more-btn" id="readMoreBtn">Ver mais</button>
          <div class="detail-actions">
            ${lastRead ? `<button class="btn btn-primary" id="continueBtn">Continuar Leitura</button>` : ''}
            <button class="btn btn-outline ${isFav ? 'active' : ''}" id="favBtn">
              ${isFav ? 'Favoritado' : 'Favoritar'}
            </button>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div id="chaptersSection">
        <div class="chapter-section-title">Capítulos</div>
        <div id="langWrap"></div>
        <div id="chapterList"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>
    `;

    document.getElementById('readMoreBtn')?.addEventListener('click', () => {
      const desc = document.getElementById('detailDesc');
      desc.classList.toggle('expanded');
      document.getElementById('readMoreBtn').textContent = desc.classList.contains('expanded') ? 'Ver menos' : 'Ver mais';
    });

    document.getElementById('favBtn')?.addEventListener('click', () => {
      const added = Store.toggleFavorite(manga);
      const btn = document.getElementById('favBtn');
      if (btn) { btn.textContent = added ? 'Favoritado' : 'Favoritar'; btn.classList.toggle('active', added); }
      UI.toast(added ? 'Adicionado aos favoritos' : 'Removido dos favoritos', added ? 'success' : 'info');
    });

    if (lastRead) {
      document.getElementById('continueBtn')?.addEventListener('click', () => {
        Router.navigate(`#/read/${lastRead.chapterId}?manga=${id}&title=${encodeURIComponent(manga.title)}`);
      });
    }

    loadChapters(id, manga, prefLang);
  } catch {
    app.innerHTML = UI.errorState('Falha ao carregar', 'Não foi possível carregar os detalhes.', () => renderMangaDetail({ id }));
  }
}

async function loadChapters(mangaId, manga, lang) {
  const listEl  = document.getElementById('chapterList');
  const langWrap = document.getElementById('langWrap');
  if (!listEl) return;

  listEl.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  let availLangs = [];
  try { availLangs = await API.getAvailableLanguages(mangaId); } catch {}

  let activeLang = lang;
  if (availLangs.length) {
    if (availLangs.includes('pt-br')) activeLang = 'pt-br';
    else if (availLangs.includes('pt')) activeLang = 'pt';
    else activeLang = availLangs[0];
  }
  Store.setPrefLang(activeLang);

  const langLabels = {
    'pt-br':'Portugues (BR)', 'pt':'Portugues (PT)', 'en':'English',
    'es':'Espanol', 'es-la':'Espanol (LA)', 'fr':'Francais',
    'de':'Deutsch', 'it':'Italiano', 'ja':'Japones', 'ko':'Coreano',
    'zh':'Chines', 'ar':'Arabe',
  };

  if (langWrap && availLangs.length > 1) {
    langWrap.innerHTML = `
      <div class="lang-dd-wrap">
        <button class="lang-dd-toggle" id="langToggle">
          Idioma: ${langLabels[activeLang] || activeLang} &#9662;
        </button>
        <div class="lang-dd-menu hidden" id="langMenu">
          ${availLangs.map(l => `
            <button class="lang-dd-item ${l === activeLang ? 'active' : ''}" data-lang="${l}">
              ${langLabels[l] || l}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.getElementById('langToggle')?.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('langMenu')?.classList.toggle('hidden');
    });
    document.getElementById('langMenu')?.addEventListener('click', e => {
      const btn = e.target.closest('.lang-dd-item');
      if (!btn) return;
      const newLang = btn.dataset.lang;
      document.getElementById('langMenu').classList.add('hidden');
      document.getElementById('langToggle').innerHTML = `Idioma: ${langLabels[newLang] || newLang} &#9662;`;
      Store.setPrefLang(newLang);
      loadChaptersList(mangaId, manga, newLang);
    });
    document.addEventListener('click', () => document.getElementById('langMenu')?.classList.add('hidden'));
  }

  loadChaptersList(mangaId, manga, activeLang);
}

async function loadChaptersList(mangaId, manga, lang) {
  const listEl = document.getElementById('chapterList');
  if (!listEl) return;
  listEl.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  try {
    const result = await API.getChapters(mangaId, lang);
    if (!result.data.length) {
      listEl.innerHTML = UI.emptyState('scroll', 'Sem capitulos', `Nenhum capitulo em ${lang} disponivel.`);
      return;
    }

    const hist    = Store.getHistory();
    const readIds = new Set(hist.filter(h => h.mangaId === mangaId).map(h => h.chapterId));

    listEl.innerHTML = `
      <div class="chapter-list">
        ${result.data.map(ch => `
          <div class="chapter-item ${readIds.has(ch.id) ? 'read' : ''} ${ch.isExternal ? 'external' : ''}"
            data-chapter-id="${ch.id}" data-manga-id="${mangaId}"
            data-chapter-num="${ch.chapter || '?'}"
            data-manga-title="${encodeURIComponent(manga.title)}"
            data-cover="${encodeURIComponent(manga.coverUrl)}"
            data-external-url="${ch.externalUrl || ''}"
            data-is-external="${ch.isExternal ? '1' : '0'}"
            role="button" tabindex="0">
            <span class="chapter-number">Cap. ${ch.chapter || '?'}</span>
            <span class="chapter-title-text">${ch.title || ''}${ch.isExternal ? ' <span class="ext-badge">Externo</span>' : ''}</span>
            <span class="chapter-date">${UI.formatDate(ch.publishAt)}</span>
          </div>
        `).join('')}
      </div>
    `;

    listEl.querySelectorAll('.chapter-item').forEach(item => {
      item.addEventListener('click', () => {
        const chId       = item.dataset.chapterId;
        const mId        = item.dataset.mangaId;
        const chNum      = item.dataset.chapterNum;
        const mTitle     = decodeURIComponent(item.dataset.mangaTitle);
        const cover      = decodeURIComponent(item.dataset.cover);
        const isExternal = item.dataset.isExternal === '1';
        const extUrl     = item.dataset.externalUrl;

        Store.addHistory({ mangaId: mId, mangaTitle: mTitle, chapterId: chId,
          chapterNum: chNum, chapterTitle: `Capitulo ${chNum}`, coverUrl: cover });

        if (isExternal && extUrl) { window.open(extUrl, '_blank', 'noopener,noreferrer'); return; }
        Router.navigate(`#/read/${chId}?manga=${mId}&title=${encodeURIComponent(mTitle)}`);
      });
    });
  } catch {
    listEl.innerHTML = UI.errorState('Erro', 'Nao foi possivel carregar os capitulos.', () => loadChaptersList(mangaId, manga, lang));
  }
}

// ── Favorites ──────────────────────────────────────────
function renderFavorites() {
  const app = document.getElementById('app');
  UI.updateNavActive('favorites');
  const favs = Store.getFavorites();
  app.innerHTML = `<div class="page-header"><h1>Favoritos</h1></div><div id="favGrid"></div>`;
  if (!favs.length) {
    document.getElementById('favGrid').innerHTML = UI.emptyState('anchor', 'Nenhum favorito ainda', 'Favorite mangas para ve-los aqui.');
    return;
  }
  UI.mangaGrid(favs, document.getElementById('favGrid'));
}

// ── History ────────────────────────────────────────────
function renderHistory() {
  const app = document.getElementById('app');
  UI.updateNavActive('history');
  const hist = Store.getHistory();

  app.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;">
      <h1>Historico</h1>
      ${hist.length ? `<button class="btn btn-outline" id="clearHistoryBtn">Limpar</button>` : ''}
    </div>
    <div id="historyList"></div>
  `;

  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    Store.clearHistory();
    UI.toast('Historico limpo', 'info');
    renderHistory();
  });

  if (!hist.length) {
    document.getElementById('historyList').innerHTML = UI.emptyState('book', 'Sem historico', 'Leia um capitulo para ele aparecer aqui.');
    return;
  }

  const listEl = document.getElementById('historyList');
  listEl.innerHTML = `
    <div class="history-list">
      ${hist.map(h => `
        <div class="history-item" data-chapter-id="${h.chapterId}" data-manga-id="${h.mangaId}"
          data-manga-title="${encodeURIComponent(h.mangaTitle)}" role="button" tabindex="0">
          <div class="history-thumb">
            <img src="${h.coverUrl || ''}" alt="${h.mangaTitle}" loading="lazy" width="46" height="64"
              referrerpolicy="no-referrer" onerror="this.style.display='none'" />
          </div>
          <div class="history-info">
            <div class="history-manga-title">${h.mangaTitle}</div>
            <div class="history-ch-title">${h.chapterTitle || 'Capitulo ' + h.chapterNum}</div>
            <div class="history-date">${UI.relativeTime(h.timestamp)}</div>
          </div>
          <span class="history-arrow">${UI.SVG.arrow}</span>
        </div>
      `).join('')}
    </div>
  `;

  listEl.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const chId   = item.dataset.chapterId;
      const mId    = item.dataset.mangaId;
      const mTitle = decodeURIComponent(item.dataset.mangaTitle);
      Router.navigate(`#/read/${chId}?manga=${mId}&title=${encodeURIComponent(mTitle)}`);
    });
  });
}

// ── Reader ─────────────────────────────────────────────
let RS = { pages: [], current: 0, mode: 'vertical', title: '', chapterId: null, mangaId: null, touchStartX: 0 };

const FS_ENTER = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
const FS_EXIT  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
const VERT_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;
const HORZ_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
const BACK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`;

async function renderReader({ chapterId }) {
  const app = document.getElementById('app');
  UI.updateNavActive('');
  document.body.classList.add('reader-mode');

  const hash     = location.hash;
  const qs       = hash.includes('?') ? hash.split('?')[1] : '';
  const urlP     = new URLSearchParams(qs);
  const mangaId  = urlP.get('manga') || '';
  const mTitle   = urlP.get('title') ? decodeURIComponent(urlP.get('title')) : 'Lendo';

  RS.mode       = Store.getReaderMode();
  RS.chapterId  = chapterId;
  RS.mangaId    = mangaId;
  RS.title      = mTitle;
  RS.current    = 0;
  RS.pages      = [];

  app.innerHTML = `
    <div class="reader-wrapper" id="readerWrapper">
      <div class="reader-header" id="readerHeader">
        <button class="reader-back-btn" id="readerBack" aria-label="Voltar">${BACK_SVG}</button>
        <div class="reader-title">${mTitle}</div>
        <div class="reader-actions">
          <button class="reader-btn" id="readerModeBtn">
            ${RS.mode === 'vertical' ? VERT_SVG + ' Vertical' : HORZ_SVG + ' Horizontal'}
          </button>
          <button class="reader-fullscreen-btn" id="readerFullscreen" title="Tela cheia">${FS_ENTER}</button>
        </div>
      </div>

      <div id="readerContent" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <div class="page-loading" style="padding-top:56px;">
          <div class="spinner" style="border-color:rgba(201,168,76,0.2);border-top-color:#c9a84c;"></div>
        </div>
      </div>

      <div class="reader-footer" id="readerFooter">
        <span class="reader-page-count" id="pageCount">0 / 0</span>
        <input type="range" class="reader-progress" id="readerProgress" min="1" value="1" step="1" />
        <button class="reader-fullscreen-btn" id="readerFullscreenFooter" title="Tela cheia">${FS_ENTER}</button>
      </div>
    </div>
  `;

  document.getElementById('readerBack')?.addEventListener('click', () => {
    exitReader();
    if (mangaId) Router.navigate(`#/manga/${mangaId}`);
    else history.back();
  });

  document.getElementById('readerModeBtn')?.addEventListener('click', () => {
    RS.mode = RS.mode === 'vertical' ? 'horizontal' : 'vertical';
    Store.setReaderMode(RS.mode);
    const btn = document.getElementById('readerModeBtn');
    if (btn) btn.innerHTML = RS.mode === 'vertical' ? VERT_SVG + ' Vertical' : HORZ_SVG + ' Horizontal';
    renderReaderPages();
  });

  // Fullscreen — dois botões (header + footer)
  const fsHandler = () => toggleFullscreen();
  document.getElementById('readerFullscreen')?.addEventListener('click', fsHandler);
  document.getElementById('readerFullscreenFooter')?.addEventListener('click', fsHandler);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  document.getElementById('readerProgress')?.addEventListener('input', e => {
    const idx = parseInt(e.target.value) - 1;
    if (RS.mode === 'horizontal') animatePage(idx, idx > RS.current ? 'next' : 'prev', true);
    else scrollToPage(idx);
  });

  try {
    const pages = await API.getChapterPages(chapterId);
    RS.pages   = pages;
    RS.current = 0;

    const prog = document.getElementById('readerProgress');
    if (prog) { prog.max = pages.length; prog.value = 1; }
    updatePageCount();
    renderReaderPages();
  } catch {
    document.getElementById('readerContent').innerHTML = `
      <div style="color:#c9a84c;text-align:center;padding:80px 24px;font-family:'Cinzel',serif;">
        <div style="font-size:18px;margin-bottom:16px;">Falha ao carregar o capitulo</div>
        <button class="btn btn-primary" onclick="location.reload()">Tentar novamente</button>
      </div>
    `;
  }
}

function renderReaderPages() {
  const content = document.getElementById('readerContent');
  if (!content || !RS.pages.length) return;

  if (RS.mode === 'vertical') {
    content.innerHTML = `
      <div class="reader-pages-vertical" id="pagesVertical">
        ${RS.pages.map((p, i) => `
          <img src="${p}" alt="Pagina ${i + 1}" loading="lazy"
            width="860" height="1230" data-index="${i}"
            onerror="this.style.opacity='0.2'" />
        `).join('')}
      </div>
    `;
    initVerticalObserver();
    initReaderScroll();
  } else {
    content.innerHTML = `
      <div class="reader-pages-horizontal" id="pagesHorizontal">
        <button class="reader-nav-btn prev" id="prevPage" aria-label="Pagina anterior">&#8249;</button>
        <div class="page-slot" id="pageSlot">
          <img class="page-img" id="currentPageImg"
            src="${RS.pages[RS.current]}" alt="Pagina ${RS.current + 1}"
            width="860" height="1230" onerror="this.style.opacity='0.2'" />
        </div>
        <button class="reader-nav-btn next" id="nextPage" aria-label="Proxima pagina">&#8250;</button>
      </div>
    `;
    document.getElementById('prevPage')?.addEventListener('click', () => goToPage(RS.current - 1, 'prev'));
    document.getElementById('nextPage')?.addEventListener('click', () => goToPage(RS.current + 1, 'next'));
    initTouchSwipe();
    initKeyboard();
  }
}

// Animação de virada de página
let _animating = false;

function animatePage(newIndex, direction, skipAnim = false) {
  if (_animating) return;
  if (newIndex < 0 || newIndex >= RS.pages.length) return;
  if (newIndex === RS.current) return;

  const slot = document.getElementById('pageSlot');
  if (!slot) { RS.current = newIndex; updatePageCount(); return; }

  if (skipAnim) {
    const img = document.getElementById('currentPageImg');
    if (img) { img.src = RS.pages[newIndex]; img.alt = `Pagina ${newIndex + 1}`; }
    RS.current = newIndex;
    updatePageCount();
    return;
  }

  _animating = true;

  const oldImg = document.getElementById('currentPageImg');
  const leaveClass = direction === 'next' ? 'leave-next' : 'leave-prev';
  const enterClass = direction === 'next' ? 'enter-next' : 'enter-prev';

  // Cria nova imagem
  const newImg = document.createElement('img');
  newImg.className = `page-img ${enterClass}`;
  newImg.src = RS.pages[newIndex];
  newImg.alt = `Pagina ${newIndex + 1}`;
  newImg.width = 860;
  newImg.height = 1230;
  newImg.onerror = () => { newImg.style.opacity = '0.2'; };

  // Anima saída da atual
  if (oldImg) oldImg.classList.add(leaveClass);

  slot.appendChild(newImg);
  RS.current = newIndex;
  updatePageCount();

  const duration = 230;
  setTimeout(() => {
    oldImg?.remove();
    newImg.className = 'page-img';
    _animating = false;
  }, duration);
}

function goToPage(index, direction) {
  const dir = direction || (index > RS.current ? 'next' : 'prev');
  animatePage(Math.max(0, Math.min(index, RS.pages.length - 1)), dir);
}

function scrollToPage(index) {
  const container = document.getElementById('pagesVertical');
  if (!container) return;
  const imgs = container.querySelectorAll('img');
  if (imgs[index]) imgs[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  RS.current = index;
  updatePageCount();
}

function updatePageCount() {
  const el   = document.getElementById('pageCount');
  const prog = document.getElementById('readerProgress');
  if (el)   el.textContent = `${RS.current + 1} / ${RS.pages.length}`;
  if (prog) prog.value = RS.current + 1;
}

function initVerticalObserver() {
  const container = document.getElementById('pagesVertical');
  if (!container) return;
  const imgs = container.querySelectorAll('img');
  const obs  = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const idx = parseInt(e.target.dataset.index);
        if (!isNaN(idx)) { RS.current = idx; updatePageCount(); }
      }
    });
  }, { threshold: 0.4, rootMargin: '-25% 0px -25% 0px' });
  imgs.forEach(img => obs.observe(img));
}

function initReaderScroll() {
  const container = document.getElementById('pagesVertical');
  if (!container) return;
  let lastY = 0;
  container.addEventListener('scroll', () => {
    const y    = container.scrollTop;
    const going = y > lastY && y > 60;
    document.getElementById('readerHeader')?.classList.toggle('hidden', going);
    document.getElementById('readerFooter')?.classList.toggle('hidden', going);
    lastY = y;
  }, { passive: true });
}

function initTouchSwipe() {
  const wrap = document.getElementById('pagesHorizontal');
  if (!wrap) return;
  wrap.addEventListener('touchstart', e => { RS.touchStartX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const diff = RS.touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goToPage(diff > 0 ? RS.current + 1 : RS.current - 1, diff > 0 ? 'next' : 'prev');
  }, { passive: true });
}

function initKeyboard() {
  const handler = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(RS.current + 1, 'next');
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goToPage(RS.current - 1, 'prev');
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    if (e.key === 'Escape' && !document.fullscreenElement) {
      exitReader();
      if (RS.mangaId) Router.navigate(`#/manga/${RS.mangaId}`);
    }
  };
  document.addEventListener('keydown', handler);
  document._readerKeyHandler = handler;
}

// Fullscreen robusto com prefixos webkit
function toggleFullscreen() {
  const wrapper = document.getElementById('readerWrapper');
  if (!wrapper) return;

  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);

  if (!isFs) {
    const req = wrapper.requestFullscreen || wrapper.webkitRequestFullscreen;
    if (req) req.call(wrapper).catch(() => {});
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document).catch(() => {});
  }
}

function onFullscreenChange() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const icon = isFs ? FS_EXIT : FS_ENTER;
  const b1   = document.getElementById('readerFullscreen');
  const b2   = document.getElementById('readerFullscreenFooter');
  if (b1) b1.innerHTML = icon;
  if (b2) b2.innerHTML = icon;
}

function exitReader() {
  document.body.classList.remove('reader-mode');
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) exit.call(document).catch(() => {});
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
  if (document._readerKeyHandler) {
    document.removeEventListener('keydown', document._readerKeyHandler);
    delete document._readerKeyHandler;
  }
  _animating = false;
}

// ── Init ───────────────────────────────────────────────
function init() {
  initTheme();
  initScrollBehavior();

  Router.define('/', renderHome);
  Router.define('/search', renderSearch);
  Router.define('/manga/:id', renderMangaDetail);
  Router.define('/favorites', renderFavorites);
  Router.define('/history', renderHistory);
  Router.define('/read/:chapterId', renderReader);

  window.addEventListener('hashchange', () => {
    if (!location.hash.startsWith('#/read/')) exitReader();
  });

  Router.init();
}

document.addEventListener('DOMContentLoaded', init);
