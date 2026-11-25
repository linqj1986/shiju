/* 拾句 - 纯静态书籍金句站
 * 路由：#/                  -> 书架
 *       #/book/{id}         -> 书籍详情（可带 ?q=关键词：预填页内筛选）
 *       #/search?q=关键词   -> 全局搜索结果（搜索逻辑见 js/search.js）
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

  // 高亮关键词（re 由 ShijuSearch.run 返回）；只能用在文本位置，属性值里仍然用 esc
  function hi(text, re) {
    var s = String(text == null ? '' : text);
    if (!re) return esc(s);
    var out = '', last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last));
  }

  /* ---------- 头部搜索框 ---------- */
  var siteHeader = document.querySelector('.site-header');
  var searchForm = document.getElementById('search-form');
  var searchInput = document.getElementById('search-input');
  var searchToggle = document.getElementById('search-toggle');

  // 窄屏：搜索框收在按钮里；在点击事件内展开并聚焦，移动端才会弹出键盘
  function openSearch() {
    siteHeader.classList.add('search-open');
    searchToggle.setAttribute('aria-expanded', 'true');
    searchInput.focus();
  }

  function closeSearch() {
    siteHeader.classList.remove('search-open');
    searchToggle.setAttribute('aria-expanded', 'false');
  }

  function setupSearch() {
    searchToggle.addEventListener('click', function () {
      if (siteHeader.classList.contains('search-open')) { closeSearch(); searchToggle.focus(); }
      else openSearch();
    });
    // 走原生 submit：输入法选词的回车不会触发提交，无需再判断 isComposing
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var kw = searchInput.value.trim();
      if (!kw) return;
      closeSearch();
      location.hash = '#/search?q=' + encodeURIComponent(kw);
    });
    searchForm.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeSearch();
      if (searchToggle.offsetParent) searchToggle.focus(); else searchInput.blur();
    });
  }

  /* ---------- 登录与收藏（纯前端 + localStorage） ---------- */
  var USER_KEY = 'shiju-user';
  var FAV_KEY = 'shiju-favs';
  var ACCOUNT = { name: 'admin', pass: 'admin' };
  var FAV_CAT = '我的收藏';
  var pendingFavId = null;

  function isLoggedIn() { return localStorage.getItem(USER_KEY) === ACCOUNT.name; }

  function favs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveFavs(list) { localStorage.setItem(FAV_KEY, JSON.stringify(list)); }
  function isFav(id) { return favs().indexOf(id) !== -1; }

  /* 远端收藏同步（Cloudflare Pages Functions + KV；API 不可用时自动降级为纯本地） */
  function pullFavs() {
    if (!isLoggedIn()) return Promise.resolve(false);
    return fetch('/api/favs?user=' + encodeURIComponent(localStorage.getItem(USER_KEY)))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.favs)) {
          saveFavs(data.favs);
          return true;
        }
        return false;
      })
      .catch(function () { return false; });
  }

  function pushFavs() {
    if (!isLoggedIn()) return;
    fetch('/api/favs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: ACCOUNT.name, pass: ACCOUNT.pass, favs: favs() })
    }).catch(function () { /* 同步失败：保留本地状态，下次登录以远端为准 */ });
  }

  function toggleFav(id) {
    var list = favs();
    var i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    saveFavs(list);
    pushFavs();
    return i === -1;
  }

  function renderAuthArea() {
    var box = document.getElementById('auth-area');
    if (isLoggedIn()) {
      box.innerHTML =
        '<span class="user-name">' + esc(localStorage.getItem(USER_KEY)) + '</span>' +
        '<button type="button" class="btn-ghost" id="logout-btn">退出</button>';
      document.getElementById('logout-btn').addEventListener('click', function () {
        localStorage.removeItem(USER_KEY);
        renderAuthArea();
        route();
      });
    } else {
      box.innerHTML = '<button type="button" class="btn-primary" id="login-btn">登录</button>';
      document.getElementById('login-btn').addEventListener('click', openLogin);
    }
  }

  function openLogin() {
    var dlg = document.getElementById('login-dialog');
    document.getElementById('login-msg').textContent = '';
    document.getElementById('login-form').reset();
    dlg.showModal();
  }

  function setupLogin() {
    var dlg = document.getElementById('login-dialog');
    var form = document.getElementById('login-form');
    var msg = document.getElementById('login-msg');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = document.getElementById('login-user').value.trim();
      var pass = document.getElementById('login-pass').value;
      if (user === ACCOUNT.name && pass === ACCOUNT.pass) {
        localStorage.setItem(USER_KEY, user);
        dlg.close();
        renderAuthArea();
        route();
        // 先拉取远端收藏（覆盖本地），再补发登录前待收藏的操作
        pullFavs().then(function () {
          var pending = pendingFavId;
          pendingFavId = null;
          if (pending) toggleFav(pending);
          route();
        });
      } else {
        msg.textContent = '用户名或密码不正确';
      }
    });

    document.getElementById('login-cancel').addEventListener('click', function () {
      pendingFavId = null;
      dlg.close();
    });
  }

  /* ---------- 书架视图 ---------- */
  function renderShelf() {
    document.title = '拾句 · 每本书最值得记住的话';

    var catOf = function (b) { return b.category || '未分类'; };

    // 聚合分类（按首次出现顺序）；登录后追加「我的收藏」
    var cats = [];
    BOOKS.forEach(function (b) {
      if (cats.indexOf(catOf(b)) === -1) cats.push(catOf(b));
    });
    if (isLoggedIn()) cats.push(FAV_CAT);
    var current = cats[0];

    function cardHtml(b) {
      var fav = isFav(b.id);
      return (
        '<article class="book-card">' +
          '<button type="button" class="fav-btn' + (fav ? ' faved' : '') + '" data-fav="' + esc(b.id) + '"' +
            ' aria-pressed="' + fav + '" aria-label="' + (fav ? '取消收藏' : '收藏') + esc(b.title) + '">★</button>' +
          '<a class="book-main" href="#/book/' + esc(b.id) + '">' +
            '<div class="book-cover" style="background:' + esc(b.gradient || 'linear-gradient(135deg,#666,#333)') + '">' +
              '<span class="cover-title">' + (b.emoji ? esc(b.emoji) + ' ' : '') + '</span>' +
            '</div>' +
            '<div class="book-body">' +
              '<div class="book-title">' + esc(b.title) + '</div>' +
              '<div class="book-author">' + esc(b.author || '') + (b.year ? ' · ' + b.year : '') + '</div>' +
              '<div class="book-intro">' + esc(b.intro || '') + '</div>' +
              '<div class="book-meta">' +
                '<div class="tag-list">' +
                  (b.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
                '</div>' +
                '<span class="quote-count">' + (b.quotes || []).length + ' 句' + ((b.models || []).length ? ' · ' + b.models.length + ' 个方法论' : '') + '</span>' +
              '</div>' +
            '</div>' +
          '</a>' +
        '</article>'
      );
    }

    function draw() {
      var list = current === FAV_CAT
        ? BOOKS.filter(function (b) { return isFav(b.id); })
        : BOOKS.filter(function (b) { return catOf(b) === current; });
      // 按出版时间排序：越新越靠前（filter 已返回新数组，不影响 BOOKS 原始顺序）
      list.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
      var quotesN = list.reduce(function (n, b) { return n + (b.quotes || []).length; }, 0);
      var modelsN = list.reduce(function (n, b) { return n + (b.models || []).length; }, 0);

      app.innerHTML =
        '<div class="shelf-head">' +
          '<h1>书架</h1>' +
          '<p>' + esc(current) + ' · ' + list.length + ' 本 · ' + quotesN + ' 条金句 · ' + modelsN + ' 个方法论</p>' +
        '</div>' +
        '<div class="tabs">' +
          cats.map(function (c) {
            var n = c === FAV_CAT ? favs().length : BOOKS.filter(function (b) { return catOf(b) === c; }).length;
            return '<button type="button" class="tab' + (c === current ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + ' ' + n + '</button>';
          }).join('') +
        '</div>' +
        (list.length
          ? '<div class="book-grid">' + list.map(cardHtml).join('') + '</div>'
          : '<p class="filter-empty">还没有收藏的书，点击书卡右上角的 ★ 收藏喜欢的书</p>');

      app.querySelectorAll('.tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          current = btn.getAttribute('data-cat');
          draw();
        });
      });

      app.querySelectorAll('.fav-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-fav');
          if (!isLoggedIn()) { pendingFavId = id; openLogin(); return; }
          toggleFav(id);
          draw();
        });
      });
    }

    draw();
    window.scrollTo(0, 0);
  }

  /* ---------- 金句 / 方法论卡片（详情页与搜索结果共用；re 非空时高亮关键词） ---------- */
  function exampleHtml(examples, H) {
    return (examples || []).map(function (e) {
      return (
        '<div class="example-item">' +
          '<span class="example-badge">' + H(e.title) + '</span>' +
          '<p>' + H(e.text) + '</p>' +
        '</div>'
      );
    }).join('');
  }

  function quoteCardHtml(q, i, re) {
    var H = function (s) { return hi(s, re); };
    var examples = exampleHtml(q.examples, H);

    return (
      '<article class="quote-card" data-search="' + esc([q.quote, q.theme, q.interpretation, q.source].concat(
        (q.examples || []).map(function (e) { return e.title + ' ' + e.text; })
      ).join(' ').toLowerCase()) + '">' +
        '<div class="q-head">' +
          '<span class="q-index">No.' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="q-theme">' + H(q.theme || '') + '</span>' +
        '</div>' +
        '<blockquote class="q-text">「' + H(q.quote) + '」</blockquote>' +
        '<div class="q-source">—— ' + H(q.source || '') + '</div>' +
        '<div class="q-section"><h3>解 读</h3><p>' + H(q.interpretation) + '</p></div>' +
        (examples ? '<div class="q-section"><h3>应用举例</h3>' + examples + '</div>' : '') +
      '</article>'
    );
  }

  function modelCardHtml(m, i, re) {
    var H = function (s) { return hi(s, re); };
    var points = (m.points || []).map(function (p) {
      return '<li>' + H(p) + '</li>';
    }).join('');
    var examples = exampleHtml(m.examples, H);

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
        '<h3 class="m-name">' + H(m.name) + '</h3>' +
        (m.en ? '<div class="m-en">' + H(m.en) + '</div>' : '') +
        '<div class="q-source">—— ' + H(m.source || '') + '</div>' +
        '<div class="q-section"><h3>核心思想</h3><p>' + H(m.core) + '</p></div>' +
        (points ? '<div class="q-section"><h3>要 点</h3><ul class="m-points">' + points + '</ul></div>' : '') +
        (examples ? '<div class="q-section"><h3>应用举例</h3>' + examples + '</div>' : '') +
      '</article>'
    );
  }

  /* ---------- 搜索结果视图 ---------- */
  var SEARCH_PAGE = 10;    // 每屏显示的书数
  var SEARCH_PREVIEW = 3;  // 每本书预览的金句数 / 方法论数

  function renderSearch(kw) {
    var res = window.ShijuSearch.run(BOOKS, kw);
    var re = res.re;
    var groups = res.groups;
    var shown = Math.min(SEARCH_PAGE, groups.length);
    var quoteN = 0, modelN = 0;
    groups.forEach(function (g) { quoteN += g.quotes.length; modelN += g.models.length; });

    document.title = (kw ? '搜索「' + kw + '」' : '搜索') + ' · 拾句';
    if (searchInput.value !== kw) searchInput.value = kw;
    document.getElementById('search-status').textContent = kw ? '找到 ' + groups.length + ' 本书' : '';

    // 一本书一组：封面 + 书名（进详情）+ 命中数 + 预览若干条；超出预览的给「查看全部」
    function groupHtml(g) {
      var b = g.book;
      var qs = g.quotes.slice(0, SEARCH_PREVIEW);
      var ms = g.models.slice(0, SEARCH_PREVIEW);
      var total = g.quotes.length + g.models.length;
      var href = '#/book/' + encodeURIComponent(b.id);
      var cards = qs.map(function (i) { return quoteCardHtml(b.quotes[i], i, re); }).join('') +
                  ms.map(function (i) { return modelCardHtml(b.models[i], i, re); }).join('');

      return (
        '<section class="search-group">' +
          '<div class="sg-head">' +
            '<span class="sg-cover" style="background:' + esc(b.gradient || 'linear-gradient(135deg,#666,#333)') + '" aria-hidden="true">' +
              esc(b.emoji || '📘') +
            '</span>' +
            '<div class="sg-info">' +
              '<a class="sg-title" href="' + href + '">' + hi(b.title, re) + '</a>' +
              '<div class="sg-meta">' + esc(b.author || '') + ' · ' + esc(b.category || '未分类') +
                (g.quotes.length ? ' · 金句 ' + g.quotes.length : '') +
                (g.models.length ? ' · 方法论 ' + g.models.length : '') +
                (g.meta ? ' · 命中书名 / 作者 / 标签' : '') +
              '</div>' +
            '</div>' +
            (total > qs.length + ms.length
              ? '<a class="sg-more" href="' + href + '?q=' + encodeURIComponent(kw) + '">查看全部 ' + total + ' 条 →</a>'
              : '') +
          '</div>' +
          (cards ? '<div class="quote-list">' + cards + '</div>' : '') +
        '</section>'
      );
    }

    var body;
    if (!kw) {
      body = '<p class="filter-empty">输入关键词，搜索全部 ' + BOOKS.length + ' 本书的金句、方法论与书名</p>';
    } else if (!groups.length) {
      body = '<p class="filter-empty">没有找到与「' + esc(kw) + '」相关的内容，换个关键词试试</p>';
    } else {
      body =
        '<div id="search-results">' + groups.slice(0, shown).map(groupHtml).join('') + '</div>' +
        (shown < groups.length
          ? '<div class="search-more"><button type="button" class="tab" id="search-more">显示更多（还有 ' +
            (groups.length - shown) + ' 本书）</button></div>'
          : '');
    }

    app.innerHTML =
      '<div class="shelf-head">' +
        '<h1>搜索结果</h1>' +
        '<p>' + (kw
          ? '「' + hi(kw, re) + '」 · ' + groups.length + ' 本书' +
            (groups.length ? ' · 金句 ' + quoteN + ' 条 · 方法论 ' + modelN + ' 个' : '')
          : '共 ' + BOOKS.length + ' 本书') +
        '</p>' +
      '</div>' + body;

    var moreBtn = document.getElementById('search-more');
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        var from = shown;
        shown = Math.min(shown + SEARCH_PAGE, groups.length);
        document.getElementById('search-results').insertAdjacentHTML('beforeend', groups.slice(from, shown).map(groupHtml).join(''));
        if (shown < groups.length) moreBtn.textContent = '显示更多（还有 ' + (groups.length - shown) + ' 本书）';
        else moreBtn.parentNode.parentNode.removeChild(moreBtn.parentNode);
      });
    }

    window.scrollTo(0, 0);
  }

  /* ---------- 书籍详情视图 ---------- */
  function renderBook(book, initKw) {
    document.title = book.title + ' · 拾句';
    var quotes = book.quotes || [];
    var fav = isFav(book.id);

    var quoteCards = quotes.map(function (q, i) { return quoteCardHtml(q, i); }).join('');
    var modelCards = (book.models || []).map(function (m, i) { return modelCardHtml(m, i); }).join('');

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
          '<a class="back-link" href="' + (initKw ? '#/search?q=' + encodeURIComponent(initKw) : '#/') + '">' +
            (initKw ? '← 返回搜索结果' : '← 返回书架') +
          '</a>' +
          '<div class="hero-emoji">' + esc(book.emoji || '📘') + '</div>' +
          '<h1>' + esc(book.title) + '</h1>' +
          (book.originalTitle ? '<div class="hero-original">' + esc(book.originalTitle) + '</div>' : '') +
          (book.author ? '<div class="hero-original">' + esc(book.author) + (book.year ? ' · ' + book.year : '') + '</div>' : '') +
          '<div class="hero-intro">' + esc(book.intro || '') + '</div>' +
          '<div class="tag-list hero-tags">' +
            (book.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
          '</div>' +
          '<button type="button" class="hero-fav' + (fav ? ' faved' : '') + '" aria-pressed="' + fav + '">' +
            (fav ? '★ 已收藏' : '☆ 收藏本书') +
          '</button>' +
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

    // 命中当前筛选词的卡片数
    function matchCount(list) {
      var kw = input.value.trim().toLowerCase(), n = 0;
      list.querySelectorAll('.quote-card').forEach(function (card) {
        if (card.getAttribute('data-search').indexOf(kw) !== -1) n++;
      });
      return n;
    }

    function showTab(name) {
      var showModels = name === 'models';
      tabButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
      if (modelList) modelList.hidden = !showModels;
      quoteList.hidden = showModels;
      applyFilter();
    }

    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { showTab(btn.getAttribute('data-tab')); });
    });

    // 从搜索结果进来（?q=关键词）：预填筛选词；金句无命中而方法论有命中时，直接切到方法论标签
    if (initKw) {
      input.value = initKw;
      if (modelList && !matchCount(quoteList) && matchCount(modelList)) showTab('models');
    }
    applyFilter();

    input.addEventListener('input', applyFilter);

    var heroFavBtn = document.querySelector('.hero-fav');
    heroFavBtn.addEventListener('click', function () {
      if (!isLoggedIn()) { pendingFavId = book.id; openLogin(); return; }
      var nowFav = toggleFav(book.id);
      heroFavBtn.classList.toggle('faved', nowFav);
      heroFavBtn.setAttribute('aria-pressed', String(nowFav));
      heroFavBtn.textContent = nowFav ? '★ 已收藏' : '☆ 收藏本书';
    });

    window.scrollTo(0, 0);
  }

  /* ---------- 路由 ---------- */
  function route() {
    closeSearch();
    // #/book/{id}?q=关键词、#/search?q=关键词：? 后是查询串，? 前按 / 切段
    var qi = location.hash.indexOf('?');
    var segs = (qi === -1 ? location.hash : location.hash.slice(0, qi)).split('/');
    var q = new URLSearchParams(qi === -1 ? '' : location.hash.slice(qi + 1)).get('q') || '';

    if (segs[1] === 'search') { renderSearch(q); return; }
    if (segs[1] === 'book' && segs[2]) {
      var id = decodeURIComponent(segs[2]);
      var book = BOOKS.filter(function (b) { return b.id === id; })[0];
      if (book) { renderBook(book, q); return; }
    }
    renderShelf();
  }

  window.addEventListener('hashchange', route);
  setupLogin();
  setupSearch();
  renderAuthArea();
  route();
  // 已登录：打开页面时拉一次远端收藏，保持多设备一致
  if (isLoggedIn()) pullFavs().then(function (changed) { if (changed) route(); });
})();
