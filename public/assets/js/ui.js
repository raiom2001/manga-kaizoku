/* MangaKaizoku — ui.js */
const UI = (() => {

  const SVG = {
    heart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    book: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    scroll: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    skull: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="11" r="7"/><path d="M9 17v2m6-2v2M9 14h.01M15 14h.01M12 11h.01"/></svg>`,
    anchor: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="22"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    arrow: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
  };

  function toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const dot = type === 'success' ? '●' : type === 'error' ? '●' : '●';
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span style="font-size:8px;">${dot}</span><span>${message}</span>`;
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('hiding');
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  function skeletonGrid(count = 12) {
    return Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skeleton-cover"></div>
        <div class="skeleton-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    `).join('');
  }

  function mangaCard(manga) {
    const isFav = Store.isFavorite(manga.id);
    const hasCover = !!manga.coverUrl;
    const coverHtml = hasCover
      ? `<img src="${manga.coverUrl}" alt="${manga.title}" loading="lazy" width="256" height="380"
           referrerpolicy="no-referrer"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
         <div class="card-cover-placeholder" style="display:none;">${SVG.book}</div>`
      : `<div class="card-cover-placeholder">${SVG.book}</div>`;

    return `
      <div class="manga-card" data-id="${manga.id}" role="button" tabindex="0" aria-label="${manga.title}">
        <div class="card-cover">
          ${coverHtml}
          <div class="card-overlay"></div>
          <button class="card-fav-btn ${isFav ? 'active' : ''}" data-manga-id="${manga.id}"
            aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            ${SVG.heart}
          </button>
        </div>
        <div class="card-body">
          <div class="card-title">${manga.title}</div>
          <div class="card-meta">${manga.author}</div>
        </div>
      </div>
    `;
  }

  function mangaGrid(mangas, container) {
    if (!mangas.length) {
      container.innerHTML = emptyState('book', 'Nenhum mangá encontrado', 'Tente buscar por outro título.');
      return;
    }
    container.innerHTML = `<div class="manga-grid">${mangas.map(mangaCard).join('')}</div>`;
    bindCardEvents(container);
  }

  function bindCardEvents(container) {
    container.querySelectorAll('.manga-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-fav-btn')) return;
        const id = card.dataset.id;
        if (id) location.hash = `#/manga/${id}`;
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const id = card.dataset.id;
          if (id) location.hash = `#/manga/${id}`;
        }
      });
    });

    container.querySelectorAll('.card-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mangaId = btn.dataset.mangaId;
        const card = btn.closest('.manga-card');
        const title = card.querySelector('.card-title').textContent;
        const author = card.querySelector('.card-meta').textContent;
        const img = card.querySelector('img');
        const manga = { id: mangaId, title, author, coverUrl: img ? img.src : '' };
        const added = Store.toggleFavorite(manga);
        btn.classList.toggle('active', added);
        btn.setAttribute('aria-label', added ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        toast(added ? 'Adicionado aos favoritos' : 'Removido dos favoritos', added ? 'success' : 'info');
      });
    });
  }

  function emptyState(iconKey, title, desc = '') {
    const icons = { book: SVG.book, scroll: SVG.scroll, anchor: SVG.anchor, search: SVG.search };
    const icon = icons[iconKey] || SVG.book;
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-title">${title}</div>
        ${desc ? `<div class="empty-desc">${desc}</div>` : ''}
      </div>
    `;
  }

  function errorState(title, desc, onRetry) {
    const btn = onRetry ? `<button class="btn btn-primary" id="retryBtn">Tentar novamente</button>` : '';
    const html = `
      <div class="error-state">
        <div class="empty-icon">${SVG.skull}</div>
        <div class="error-title">${title}</div>
        <div class="error-desc">${desc}</div>
        ${btn}
      </div>
    `;
    if (onRetry) setTimeout(() => document.getElementById('retryBtn')?.addEventListener('click', onRetry), 0);
    return html;
  }

  function pagination(current, total, perPage, onChange) {
    const pages = Math.ceil(total / perPage);
    if (pages <= 1) return '';
    const maxVisible = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(pages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    const buttons = [];
    buttons.push(`<button class="page-btn" ${current === 1 ? 'disabled' : ''} data-page="${current - 1}">&#8249;</button>`);
    for (let i = start; i <= end; i++) {
      buttons.push(`<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }
    buttons.push(`<button class="page-btn" ${current === pages ? 'disabled' : ''} data-page="${current + 1}">&#8250;</button>`);

    const html = `<div class="pagination">${buttons.join('')}</div>`;
    setTimeout(() => {
      document.querySelectorAll('.pagination .page-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => onChange(parseInt(btn.dataset.page)));
      });
    }, 0);
    return html;
  }

  function updateNavActive(route) {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return iso; }
  }

  function relativeTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 2) return 'agora';
    if (m < 60) return `${m}min`;
    if (h < 24) return `${h}h`;
    if (d < 30) return `${d}d`;
    return formatDate(new Date(ts).toISOString());
  }

  return { toast, skeletonGrid, mangaCard, mangaGrid, bindCardEvents,
           emptyState, errorState, pagination, updateNavActive, formatDate, relativeTime, SVG };
})();
