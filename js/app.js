/* 拾句 - 纯静态书籍金句站
 * 路由：#/           -> 书架
 *       #/book/{id}  -> 书籍详情
 */
(function () {
  'use strict';

  var BOOKS = window.BOOKS || [];
  var app = document.getElementById('app');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- 书架视图 ---------- */
  function renderShelf() {
    document.title = '拾句 · 每本书最值得记住的话';
    var cards = BOOKS.map(function (b) {
      return (
        '<a class="book-card" href="#/book/' + esc(b.id) + '">' +
          '<div class="book-cover" style="background:' + esc(b.gradient || 'linear-gradient(135deg,#666,#333)') + '">' +
            '<span class="cover-title">' + (b.emoji ? esc(b.emoji) + ' ' : '') + '</span>' +
          '</div>' +
          '<div class="book-body">' +
            '<div class="book-title">' + esc(b.title) + '</div>' +
            '<div class="book-author">' + esc(b.author || '') + '</div>' +
            '<div class="book-intro">' + esc(b.intro || '') + '</div>' +
            '<div class="book-meta">' +
              '<div class="tag-list">' +
                (b.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
              '</div>' +
              '<span class="quote-count">' + (b.quotes || []).length + ' 句' + ((b.models || []).length ? ' · ' + b.models.length + ' 个方法论' : '') + '</span>' +
            '</div>' +
          '</div>' +
        '</a>'
      );
    }).join('');

    app.innerHTML =
      '<div class="shelf-head">' +
        '<h1>书架</h1>' +
        '<p>共 ' + BOOKS.length + ' 本 · ' + BOOKS.reduce(function (n, b) { return n + (b.quotes || []).length; }, 0) + ' 条金句 · ' + BOOKS.reduce(function (n, b) { return n + (b.models || []).length; }, 0) + ' 个方法论</p>' +
      '</div>' +
      '<div class="book-grid">' + cards + '</div>';
    window.scrollTo(0, 0);
  }

  /* ---------- 书籍详情视图 ---------- */
  function renderBook(book) {
    document.title = book.title + ' · 拾句';
    var quotes = book.quotes || [];

    var quoteCards = quotes.map(function (q, i) {
      var examples = (q.examples || []).map(function (e) {
        return (
          '<div class="example-item">' +
            '<span class="example-badge">' + esc(e.title) + '</span>' +
            '<p>' + esc(e.text) + '</p>' +
          '</div>'
        );
      }).join('');

      return (
        '<article class="quote-card" data-search="' + esc([q.quote, q.theme, q.interpretation, q.source].concat(
          (q.examples || []).map(function (e) { return e.title + ' ' + e.text; })
        ).join(' ').toLowerCase()) + '">' +
          '<div class="q-head">' +
            '<span class="q-index">No.' + String(i + 1).padStart(2, '0') + '</span>' +
            '<span class="q-theme">' + esc(q.theme || '') + '</span>' +
          '</div>' +
          '<blockquote class="q-text">「' + esc(q.quote) + '」</blockquote>' +
          '<div class="q-source">—— ' + esc(q.source || '') + '</div>' +
          '<div class="q-section"><h3>解 读</h3><p>' + esc(q.interpretation) + '</p></div>' +
          (examples ? '<div class="q-section"><h3>应用举例</h3>' + examples + '</div>' : '') +
        '</article>'
      );
    }).join('');

    var modelCards = (book.models || []).map(function (m, i) {
      var points = (m.points || []).map(function (p) {
        return '<li>' + esc(p) + '</li>';
      }).join('');
      var mExamples = (m.examples || []).map(function (e) {
        return (
          '<div class="example-item">' +
            '<span class="example-badge">' + esc(e.title) + '</span>' +
            '<p>' + esc(e.text) + '</p>' +
          '</div>'
        );
      }).join('');

      return (
        '<article class="quote-card model-card" data-search="' + esc([m.name, m.en, m.source, m.core].concat(
          m.points || []
        ).concat(
          (m.examples || []).map(function (e) { return e.title + ' ' + e.text; })
        ).join(' ').toLowerCase()) + '">' +
          '<div class="q-head">' +
            '<span class="q-index">M' + String(i + 1).padStart(2, '0') + '</span>' +
            '<span class="q-theme model-badge">方法论</span>' +
          '</div>' +
          '<h3 class="m-name">' + esc(m.name) + '</h3>' +
          (m.en ? '<div class="m-en">' + esc(m.en) + '</div>' : '') +
          '<div class="q-source">—— ' + esc(m.source || '') + '</div>' +
          '<div class="q-section"><h3>核心思想</h3><p>' + esc(m.core) + '</p></div>' +
          (points ? '<div class="q-section"><h3>要 点</h3><ul class="m-points">' + points + '</ul></div>' : '') +
          (mExamples ? '<div class="q-section"><h3>应用举例</h3>' + mExamples + '</div>' : '') +
        '</article>'
      );
    }).join('');

    var hasModels = !!modelCards;
    var quoteCount = quotes.length;
    var modelCount = (book.models || []).length;

    var tabsBar = hasModels ? (
      '<div class="tabs">' +
        '<button type="button" class="tab active" data-tab="quotes">金句 ' + quoteCount + '</button>' +
        '<button type="button" class="tab" data-tab="models">方法论 ' + modelCount + '</button>' +
      '</div>'
    ) : '';

    var modelsSection = hasModels ? (
      '<div class="quote-list" id="model-list" hidden>' +
        '<div class="section-head">' +
          '<h2>核心方法与理论</h2>' +
          '<p>书中提出的思维框架与决策工具</p>' +
        '</div>' +
        modelCards +
      '</div>'
    ) : '';

    app.innerHTML =
      '<section class="book-hero" style="background:' + esc(book.gradient || 'linear-gradient(135deg,#555,#222)') + '">' +
        '<div class="container hero-inner">' +
          '<a class="back-link" href="#/">← 返回书架</a>' +
          '<div class="hero-emoji">' + esc(book.emoji || '📘') + '</div>' +
          '<h1>' + esc(book.title) + '</h1>' +
          (book.originalTitle ? '<div class="hero-original">' + esc(book.originalTitle) + '</div>' : '') +
          (book.author ? '<div class="hero-original">' + esc(book.author) + '</div>' : '') +
          '<div class="hero-intro">' + esc(book.intro || '') + '</div>' +
          '<div class="tag-list hero-tags">' +
            (book.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
          '</div>' +
        '</div>' +
      '</section>' +
      '<div class="container">' +
        tabsBar +
        '<div class="filter-bar">' +
          '<input type="search" id="quote-filter" placeholder="筛选当前内容，如「激励」「复利」「误判」…">' +
        '</div>' +
        '<div class="quote-list" id="quote-list">' + quoteCards + '</div>' +
        modelsSection +
      '</div>';

    // 标签页切换 + 关键词过滤（仅作用于当前标签页）
    var input = document.getElementById('quote-filter');
    var quoteList = document.getElementById('quote-list');
    var modelList = document.getElementById('model-list');
    var tabButtons = document.querySelectorAll('.tab');
    var emptyTip = null;

    function activeList() {
      return (modelList && !modelList.hidden) ? modelList : quoteList;
    }

    function applyFilter() {
      var kw = input.value.trim().toLowerCase();
      var list = activeList();
      var visible = 0;
      list.querySelectorAll('.quote-card').forEach(function (card) {
        var hit = !kw || card.getAttribute('data-search').indexOf(kw) !== -1;
        card.style.display = hit ? '' : 'none';
        if (hit) visible++;
      });
      var head = list.querySelector('.section-head');
      if (head) head.style.display = visible ? '' : 'none';
      if (!visible) {
        if (!emptyTip) {
          emptyTip = document.createElement('p');
          emptyTip.className = 'filter-empty';
          emptyTip.textContent = '没有匹配的内容，换个关键词试试';
        }
        list.appendChild(emptyTip);
      } else if (emptyTip && emptyTip.parentNode) {
        emptyTip.parentNode.removeChild(emptyTip);
      }
    }

    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
        var showModels = btn.getAttribute('data-tab') === 'models';
        modelList.hidden = !showModels;
        quoteList.hidden = showModels;
        applyFilter();
      });
    });

    input.addEventListener('input', applyFilter);

    window.scrollTo(0, 0);
  }

  /* ---------- 路由 ---------- */
  function route() {
    var m = location.hash.match(/^#\/book\/(.+)$/);
    if (m) {
      var id = decodeURIComponent(m[1]);
      var book = BOOKS.filter(function (b) { return b.id === id; })[0];
      if (book) { renderBook(book); return; }
    }
    renderShelf();
  }

  window.addEventListener('hashchange', route);
  route();
})();
