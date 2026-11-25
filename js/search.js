/* 拾句 - 全局搜索（纯逻辑，不依赖 DOM；渲染在 app.js）
 * 可搜索范围：
 *   书籍   书名 / 原名 / 作者 / 分类 / 标签
 *   金句   正文 / 主题 / 出处 / 解读 / 应用举例
 *   方法论 名称 / 英文名 / 出处 / 核心思想 / 要点 / 应用举例
 * 多个关键词用空格分隔取交集；不区分大小写；按字面匹配（含正则特殊字符也不会出错）
 * 相关度：按字段加权计分（正文 / 主题 / 名称 > 解读 / 核心 / 要点 > 出处 / 举例；书名 > 作者 / 原名 > 标签 > 分类）
 */
(function () {
  'use strict';

  /* 字段与权重：[权重, 字段名] */
  var BOOK_FIELDS = [[10, 'title'], [5, 'originalTitle'], [5, 'author'], [3, 'tags'], [1, 'category']];
  var QUOTE_FIELDS = [[4, 'quote'], [4, 'theme'], [2, 'interpretation'], [1, 'source'], [1, 'examples']];
  var MODEL_FIELDS = [[4, 'name'], [4, 'en'], [2, 'core'], [2, 'points'], [1, 'source'], [1, 'examples']];

  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function lower(s) { return String(s == null ? '' : s).toLowerCase(); }

  // 一条数据 -> [[权重, 小写文本], ...]；字段范围与 app.js 详情页筛选（data-search）保持一致
  function fieldsOf(o, spec) {
    return spec.map(function (f) {
      var key = f[1];
      var text = key === 'examples'
        ? (o.examples || []).map(function (e) { return e.title + ' ' + e.text; }).join(' ')
        : Array.isArray(o[key]) ? o[key].join(' ') : o[key];
      return [f[0], lower(text)];
    });
  }

  var cachedFor = null;
  var index = [];

  // 索引：每本书及其金句、方法论的字段文本，首次搜索时构建并缓存
  function indexOf(books) {
    if (cachedFor === books) return index;
    index = books.map(function (b) {
      return {
        book: fieldsOf(b, BOOK_FIELDS),
        quotes: (b.quotes || []).map(function (q) { return fieldsOf(q, QUOTE_FIELDS); }),
        models: (b.models || []).map(function (m) { return fieldsOf(m, MODEL_FIELDS); })
      };
    });
    cachedFor = books;
    return index;
  }

  // 得分 = Σ 字段权重 × (该字段命中的关键词数 / 关键词总数)；未同时包含所有关键词则为 0
  function scoreOf(fields, tests) {
    var score = 0;
    var found = [];
    fields.forEach(function (f) {
      var n = 0;
      tests.forEach(function (re, k) { if (re.test(f[1])) { n++; found[k] = true; } });
      if (n) score += f[0] * n / tests.length;
    });
    return tests.every(function (re, k) { return found[k]; }) ? score : 0;
  }

  // 按得分降序，同分按原序号 -> [{ i, score }]
  function ranked(list, tests) {
    var hits = [];
    list.forEach(function (fields, i) {
      var score = scoreOf(fields, tests);
      if (score > 0) hits.push({ i: i, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    return hits;
  }

  function total(n, h) { return n + h.score; }

  /* 关键词 -> 结果
   * 返回 { terms, re, groups }
   *   terms   小写关键词数组（空数组表示无有效关键词）
   *   re      用于高亮的正则（gi），terms 为空时为 null
   *   groups  按得分从高到低，每项
   *           { book, quotes: [金句序号], models: [方法论序号], meta: 是否命中书籍信息, score: 本书合计得分 }
   *           其中 quotes / models 内部也已按得分排好序 */
  function run(books, keyword) {
    var terms = lower(keyword).trim().split(/\s+/).filter(function (t, i, arr) {
      return t && arr.indexOf(t) === i;
    });
    var res = { terms: terms, re: null, groups: [] };
    if (!terms.length) return res;

    var tests = terms.map(function (t) { return new RegExp(escapeRegExp(t), 'i'); });
    res.re = new RegExp(terms.map(escapeRegExp).join('|'), 'gi');

    indexOf(books).forEach(function (idx, i) {
      var quotes = ranked(idx.quotes, tests);
      var models = ranked(idx.models, tests);
      var meta = scoreOf(idx.book, tests);
      if (meta || quotes.length || models.length) {
        res.groups.push({
          book: books[i],
          quotes: quotes.map(function (h) { return h.i; }),
          models: models.map(function (h) { return h.i; }),
          meta: meta > 0,
          score: meta + quotes.reduce(total, 0) + models.reduce(total, 0)
        });
      }
    });
    res.groups.sort(function (a, b) { return b.score - a.score; });
    return res;
  }

  window.ShijuSearch = { run: run };
})();
