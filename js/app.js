(function () {
  var root = document.getElementById('ktg');
  if (!root) return;
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
  var rub = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽'; };
  // Папка файлов лендинга: на сайте её даёт data-lp у корня, в прототипе — пусто, пути от страницы.
  var LP = root.dataset.lp || '';
  function lpFix(v) {
    if (typeof v === 'string') return /^(img|video)\//.test(v) ? LP + v : v;
    if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { v[k] = lpFix(v[k]); });
    return v;
  }
  if (LP) ['KTG_DATA'].forEach(function (k) { lpFix(window[k]); });
  var SITE = 'https://arenda-attrakcionov.ru';
  var TICK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  var PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var DEL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // Калькулятор: позиции и цены состояний — с карточек сайта (docs/build_data.py → MBL_CALC). Нормы — отраслевые, из старого лендинга мебели (README, «Вопросы»).
  var CALC = window.MBL_CALC || {};
  var FORMATS = {
    konf: { name: 'Конференция',
      set: [{ id: 97228, per: 1 }, { id: 103574, fixed: 2, note: 'президиум' }, { id: 70372, per: 150, note: 'регистрация' }] },
    banket: { name: 'Банкет',
      set: [{ id: 103565, per: 10 }, { id: 67242, per: 1 }] },
    furshet: { name: 'Фуршет',
      set: [{ id: 105852, per: 4 }, { id: 103574, per: 20, note: 'линия раздачи' }] },
    launzh: { name: 'Лаунж',
      // мягкие места на треть гостей: группа = двухместный диван и два кресла (4 места)
      set: [{ id: 69780, group: 1 }, { id: 69811, group: 2 }] }
  };
  var ADDS = [
    { key: 'resepshn', id: 70372, name: 'Стойка регистрации', not: 'konf', img: 'img/razdely/resepshn.webp' },
    { key: 'garderob', id: 80711, name: 'Выездной гардероб', img: 'img/razdely/garderob.webp' }
  ];
  // Состояние — как на карточках: под скатерть и чехлы / прокатный / как новый. «В текстиле» — технический со скатертью, чехлом или подушкой, где есть.
  var TIERS = [
    { key: 'tech', name: 'Технический', d: 'Следы эксплуатации — под скатерть и чехлы', pick: ['Технический'] },
    { key: 'prok', name: 'Прокатный', d: 'Презентабельный вид, следы почти не видны', pick: ['Прокатный', 'Стандартный'] },
    { key: 'tex', name: 'В текстиле', d: 'Технический со скатертью, чехлом или подушкой', pick: ['Тех. со скатертью', 'Тех. с чехлом', 'Тех. с подушкой', 'Технический'] },
    { key: 'korp', name: 'Корпоративный', d: 'Как новая — для приёмов и делегаций', pick: ['Корпоративный'] }
  ];
  function tierOf(key) { return TIERS.filter(function (t) { return t.key === key; })[0]; }
  function price(id, tkey) {
    var c = CALC[id]; if (!c) return [0, ''];
    if (!c.t.length) return [c.p, ''];
    var want = tierOf(tkey).pick.concat(['Технический']);
    for (var k = 0; k < want.length; k++) for (var j = 0; j < c.t.length; j++) if (c.t[j][0] === want[k]) return [c.t[j][1], c.t[j][0]];
    return [c.t[0][1], c.t[0][0]];
  }
  function qtyOf(s, g) {
    if (s.fixed) return s.fixed;
    if (s.group) return Math.max(1, Math.ceil(Math.ceil(g * 0.3) / 4)) * s.group;
    return Math.max(1, Math.ceil(g / s.per));
  }
  function calcRows(fmt, g, tkey, adds) {
    var rows = FORMATS[fmt].set.map(function (s) { return { id: s.id, q: qtyOf(s, g), note: s.note }; });
    ADDS.forEach(function (a) { if (adds[a.key] && a.not !== fmt) rows.push({ id: a.id, q: 1, from: !CALC[a.id].t.length }); });
    rows.forEach(function (r) { var p = price(r.id, tkey); r.p = p[0]; r.t = p[1]; r.sum = r.p * r.q; });
    return rows;
  }
  function calcTotal(rows) { return rows.reduce(function (a, r) { return a + r.sum; }, 0); }

  var DATA = window.KTG_DATA || [];
  var byId = {};
  DATA.forEach(function (g) { g.items.forEach(function (it) { ['u', 'i', 'b'].forEach(function (k) { if (it[k].charAt(0) === '/') it[k] = SITE + it[k]; }); if (!byId[it.id]) byId[it.id] = { it: it, g: g }; }); });
  var totalUnique = Object.keys(byId).length;
  $$('[data-total-items]').forEach(function (el) { el.textContent = (Math.floor(totalUnique / 100) * 100) + '+'; });

  var store = { get: function (k, d) { try { var v = localStorage.getItem('mbl_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
                set: function (k, v) { try { localStorage.setItem('mbl_' + k, JSON.stringify(v)); } catch (e) {} } };

  var state = { fmt: 'banket', tier: 'tech', guests: 50, adds: {}, calcOn: false,
                picks: store.get('picks', []).filter(function (id) { return byId[id]; }), qty: store.get('qty', {}),
                group: DATA[0] ? DATA[0].slug : '', q: '', sort: 'pop', limit: 12, list: [] };

  // Цели Метрики — общие на все лендинги (условие «содержит» _lead/_cta/_calc_use), lp — разрез по странице.
  var calcUsed = false;
  function goal(name, params) { if (window.ym) window.ym(24366505, 'reachGoal', name, Object.assign({ lp: 'mebel' }, params)); }
  function calcUse() { if (!calcUsed) { calcUsed = true; goal('mbl_calc_use'); } }

  function savePicks() { store.set('picks', state.picks); store.set('qty', state.qty); }
  function isPicked(id) { return state.picks.indexOf(id) !== -1; }
  function bump() { var c = $('[data-cart]'); c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); }
  function togglePick(id) {
    var i = state.picks.indexOf(id);
    if (i === -1) { state.picks.push(id); state.qty[id] = state.qty[id] || 1; } else { state.picks.splice(i, 1); delete state.qty[id]; }
    savePicks(); renderPicksEverywhere();
    if (i === -1) bump();
  }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  /* ---------- калькулятор ---------- */
  function fromPP(fmt) { var rows = calcRows(fmt, 50, 'tech', {}); return 'от ' + rub(calcTotal(rows) / 50) + ' на гостя'; }
  $$('[data-fmt-from]').forEach(function (el) { el.innerHTML = fromPP(el.dataset.fmtFrom).replace(/(\d[\d\s]* ₽)/, '<span>$1</span>'); });
  $$('[data-fmt-pp]').forEach(function (el) { el.outerHTML = fromPP(el.dataset.fmtPp).replace(/(\d[\d\s]* ₽)/, '<span>$1</span>'); });

  function renderFormats() {
    $('[data-fmt-seg]').innerHTML = Object.keys(FORMATS).map(function (k) {
      return '<button type="button" class="ktg-group' + (k === state.fmt ? ' is-on' : '') + '" data-fmt-set="' + k + '"><img src="' + LP + 'img/formaty/' + k + '.webp" alt=""><b>' + FORMATS[k].name + '</b></button>';
    }).join('');
    $('[data-tiers]').innerHTML = TIERS.map(function (t) {
      var sum = calcTotal(calcRows(state.fmt, state.guests, t.key, state.adds));
      return '<button type="button" class="ktg-tier' + (t.key === state.tier ? ' is-on' : '') + '" data-tier="' + t.key + '"><span class="ktg-tier__tick">' + TICK + '</span><b>' + t.name + '</b>' +
        '<div class="ktg-tier__price">' + rub(sum) + '</div><div class="ktg-tier__out">' + t.d + '</div></button>';
    }).join('');
    $('[data-adds]').innerHTML = ADDS.filter(function (a) { return a.not !== state.fmt; }).map(function (a) {
      var c = CALC[a.id];
      return '<button type="button" class="ktg-group' + (state.adds[a.key] ? ' is-on' : '') + '" data-add="' + a.key + '"><img src="' + LP + a.img + '" alt=""><b>' + a.name + '</b><small>' + (c.t.length ? '' : 'от ') + rub(price(a.id, state.tier)[0]) + '</small></button>';
    }).join('');
  }

  function calcName() { return FORMATS[state.fmt].name + ' · ' + state.guests + ' ' + plural(state.guests, 'гость', 'гостя', 'гостей') + ' · ' + tierOf(state.tier).name.toLowerCase(); }
  function renderSum() {
    var rows = calcRows(state.fmt, state.guests, state.tier, state.adds), total = calcTotal(rows);
    $('[data-sum-title]').textContent = calcName();
    $('[data-sum-rows]').innerHTML = rows.map(function (r) {
      var c = CALC[r.id];
      return '<div class="ktg-sum__row mbl-row"><img src="' + c.i + '" alt=""><span><a href="' + c.u + '" target="_blank" rel="noopener">' + c.n + '</a>' +
        '<small>' + r.q + ' шт × ' + (r.from ? 'от ' : '') + rub(r.p) + (r.note ? ' · ' + r.note : '') + (r.t && r.t !== 'Технический' && r.t !== 'Стандартный' && r.t !== 'Прокатный' && r.t !== 'Корпоративный' ? ' · ' + r.t.replace('Тех. ', '').toLowerCase() : '') + '</small></span><b>' + rub(r.sum) + '</b></div>';
    }).join('') + '<div class="ktg-sum__row"><span>Доставка</span><b>в корзине</b></div>';
    $('[data-sum-total]').textContent = rub(total);
    $('[data-sum-pp]').innerHTML = '<span>≈ ' + rub(total / state.guests) + ' на гостя</span><span>' + rows.reduce(function (a, r) { return a + r.q; }, 0) + ' предметов</span>';
    var p = $('[data-sum-picks]');
    p.hidden = !state.picks.length;
    p.innerHTML = state.picks.length ? '<b>+ ' + state.picks.length + ' ' + plural(state.picks.length, 'позиция', 'позиции', 'позиций') + ' из каталога</b> в подборке' : '';
  }

  function setGuests(v) {
    v = parseInt(String(v).replace(/\D/g, ''), 10) || 10;
    state.guests = Math.min(2000, Math.max(10, v));
    $('[data-guests]').value = state.guests;
    var r = $('[data-guests-range]'); r.value = Math.min(500, state.guests);
    r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%');
    renderFormats(); renderSum();
  }

  function goCalc(fmt) {
    if (FORMATS[fmt]) state.fmt = fmt;
    renderFormats(); renderSum();
    $('#calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- каталог ---------- */
  function renderGroups() {
    $('[data-groups]').innerHTML = DATA.map(function (g) {
      return '<button type="button" class="ktg-group' + (g.slug === state.group && !state.q ? ' is-on' : '') + '" data-group="' + g.slug + '"><img src="' + g.icon + '" alt="" loading="lazy"><b>' + g.name + '</b><small>' + g.items.length + ' ' + plural(g.items.length, 'позиция', 'позиции', 'позиций') + '</small></button>';
    }).join('');
    document.dispatchEvent(new CustomEvent('ktg:group', { detail: state.q ? '' : state.group }));
  }

  function currentList() {
    var list;
    if (state.q) {
      var q = state.q.toLowerCase(), seen = {};
      list = [];
      DATA.forEach(function (g) { g.items.forEach(function (it) { if (!seen[it.id] && it.n.toLowerCase().indexOf(q) !== -1) { seen[it.id] = 1; list.push(it); } }); });
    } else {
      var grp = DATA.filter(function (g) { return g.slug === state.group; })[0];
      list = grp ? grp.items.slice() : [];
    }
    if (state.sort !== 'pop') list.sort(function (a, b) { var x = a.v || 1e9, y = b.v || 1e9; return state.sort === 'asc' ? x - y : (b.v || 0) - (a.v || 0); });
    return list;
  }

  function itemCard(it) {
    return '<div class="ktg-item" data-id="' + it.id + '"><div class="ktg-item__img" data-qv-open><img src="' + it.i + '" alt="" loading="lazy"></div>' +
      '<div class="ktg-item__body"><div class="ktg-item__name" data-qv-open>' + it.n + '</div><div class="ktg-item__row"><span class="ktg-item__price">' + it.p + '</span>' +
      '<button type="button" class="ktg-pick' + (isPicked(it.id) ? ' is-on' : '') + '" data-pick aria-label="В подборку">' + (isPicked(it.id) ? TICK.replace(/12/g, '18') : PLUS) + '</button></div></div></div>';
  }
  function renderGrid() {
    state.list = currentList();
    var shown = state.list.slice(0, state.limit);
    $('[data-grid]').innerHTML = shown.length ? shown.map(itemCard).join('') : '<div class="ktg-empty" style="grid-column:1/-1">Ничего не нашли. Напишите менеджеру — подберём похожее.</div>';
    var grp = DATA.filter(function (g) { return g.slug === state.group; })[0];
    $('[data-count]').textContent = state.q ? 'Найдено: ' + state.list.length : (grp ? grp.name + ' — ' + grp.sub.toLowerCase() : '');
    $('[data-more]').hidden = state.list.length <= state.limit;
    $('[data-more]').textContent = 'Показать ещё ' + Math.min(12, state.list.length - state.limit);
    var link = $('[data-group-link]');
    link.hidden = !!state.q || !grp;
    if (grp) { link.href = grp.url; link.textContent = 'Раздел «' + grp.name + '» в каталоге'; }
  }
  function setGroup(slug, scroll) {
    state.group = slug; state.q = ''; state.limit = 12; $('[data-search]').value = '';
    renderGroups(); renderGrid();
    if (scroll) $('[data-count]').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- быстрый просмотр ---------- */
  var qvIndex = -1;
  function openQv(id) {
    var rec = byId[id]; if (!rec) return;
    qvIndex = state.list.map(function (x) { return x.id; }).indexOf(id);
    var it = rec.it, m = $('[data-qv]');
    m.dataset.id = id;
    $('[data-qv-img]').src = it.i;
    var big = new Image(); big.onload = function () { if (m.dataset.id == id) $('[data-qv-img]').src = it.b; }; big.src = it.b;
    $('[data-qv-group]').textContent = rec.g.name;
    $('[data-qv-name]').textContent = it.n;
    $('[data-qv-price]').textContent = it.p;
    $('[data-qv-link]').href = it.u;
    var cd = (window.KTG_CARDS || {})[it.id] || { o: [], g: [] };
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    $('[data-qv-opts]').innerHTML = cd.o.map(function (o) { return '<div class="ktg-qv__opt"><b>' + esc(o.n) + '</b><span>' + rub(o.p) + '</span>' + (o.d ? '<small>' + esc(o.d) + '</small>' : '') + '</div>'; }).join('');
    $('[data-qv-desc]').textContent = '';
    var gal = [{ i: it.i, b: it.b }].concat(cd.g.map(function (u) { return { i: SITE + u, b: SITE + u }; })).slice(0, 5);
    $('.ktg-qv__sim', m).hidden = gal.length < 2;
    $('[data-qv-sim]').innerHTML = gal.map(function (x, k) { return '<img src="' + x.i + '" alt="" data-qv-photo="' + x.b + '"' + (k ? '' : ' class="is-on"') + '>'; }).join('');
    $$('[data-qv-prev]').forEach(function (b) { b.disabled = qvIndex <= 0; });
    $$('[data-qv-next]').forEach(function (b) { b.disabled = qvIndex === -1 || qvIndex >= state.list.length - 1; });
    syncQvPick();
    open(m);
  }
  function syncQvPick() {
    var m = $('[data-qv]'), id = +m.dataset.id, b = $('[data-qv-pick]');
    b.textContent = isPicked(id) ? 'В подборке — убрать' : 'Добавить в подборку';
    b.className = 'ktg-btn ktg-btn--wide ' + (isPicked(id) ? 'ktg-btn--soft' : 'ktg-btn--primary');
  }

  /* ---------- подборка ---------- */
  function calcLine() {
    var rows = calcRows(state.fmt, state.guests, state.tier, state.adds);
    return [calcName(), rub(calcTotal(rows)) + ' · доставка в корзине', rows.map(function (r) { return CALC[r.id].n + ' × ' + r.q; }).join(', ')];
  }
  function renderDrawer() {
    var tc = $('[data-to-cart]');
    if (tc) tc.style.display = state.picks.length || state.calcOn ? '' : 'none';
    var cl = state.calcOn ? calcLine() : null;
    var calc = cl ? '<div class="ktg-dl ktg-dl--calc"><div><b>Расчёт: ' + cl[0] + '</b><span>' + cl[1] + '</span><span class="ktg-dl__sub">' + cl[2] + '</span></div><button type="button" data-uncalc aria-label="Убрать">' + DEL + '</button></div>' : '';
    $('[data-drawer-list]').innerHTML = calc + (state.picks.length ? state.picks.map(function (id) {
      var it = byId[id].it, q = state.qty[id] || 1;
      return '<div class="ktg-dl" data-id="' + id + '"><img src="' + it.i + '" alt=""><div><b>' + it.n + '</b><span>' + it.p + ' × ' + q + ' шт</span>' +
        '<div class="mbl-q"><button type="button" data-q="-1" aria-label="Меньше">−</button><i>' + q + '</i><button type="button" data-q="1" aria-label="Больше">+</button></div></div>' +
        '<button type="button" data-unpick aria-label="Убрать">' + DEL + '</button></div>';
    }).join('') : calc ? '' : '<p class="ktg-empty" style="padding:24px 0">Добавляйте позиции из каталога — они появятся здесь.</p>');
  }
  // В корзину сайта — тем же /_ktg_tocart.php, что у кейтеринг-хаба: «номер:штук» → первый комплект карточки (технический).
  function toCart(b, items) {
    goal('mbl_cart');
    var body = new URLSearchParams();
    body.append('items', Object.keys(items).map(function (id) { return id + ':' + items[id]; }).join(','));
    body.append('guests', 0);
    b.disabled = true;
    fetch('/_ktg_tocart.php', { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function () { location.href = '/cart/'; })
      .catch(function () { b.disabled = false; });
  }
  function calcItems() { var q = {}; calcRows(state.fmt, state.guests, state.tier, state.adds).forEach(function (r) { q[r.id] = (q[r.id] || 0) + r.q; }); return q; }
  function drawerItems() {
    var q = state.calcOn ? calcItems() : {};
    state.picks.forEach(function (id) { q[id] = (q[id] || 0) + (state.qty[id] || 1); });
    return q;
  }
  function renderPicksEverywhere() {
    var n = state.picks.length, c = $('[data-cart]');
    $('[data-cart-n]').textContent = n;
    c.classList.toggle('is-shown', n > 0);
    $$('.ktg-item').forEach(function (el) { var id = +el.dataset.id, b = $('[data-pick]', el); b.classList.toggle('is-on', isPicked(id)); b.innerHTML = isPicked(id) ? TICK.replace(/12/g, '18') : PLUS; });
    if ($('[data-qv]').classList.contains('is-open')) syncQvPick();
    renderSum(); renderDrawer();
  }

  /* ---------- окна ---------- */
  var overlay = $('[data-overlay]');
  function open(el) { $$('.ktg-modal.is-open,.ktg-drawer.is-open').forEach(function (x) { if (x !== el) x.classList.remove('is-open'); }); el.classList.add('is-open'); overlay.classList.add('is-open'); document.documentElement.style.overflow = 'hidden'; }
  function closeAll() { $$('.is-open').forEach(function (x) { if (!x.matches('[data-dd]')) x.classList.remove('is-open'); }); overlay.classList.remove('is-open'); document.documentElement.style.overflow = ''; }

  /* ---------- события ---------- */
  root.addEventListener('click', function (e) {
    if (e.target.closest('#calc,[data-fmt]')) state.calcOn = true;
    if (e.target.closest('#calc')) calcUse();
    var t = e.target.closest('button,a,[data-qv-open],[data-qv-photo],[data-add]');
    var dd = $('[data-dd]');
    if (!e.target.closest('[data-dd]')) dd.classList.remove('is-open');
    if (!t) return;
    if (t.matches('a[href$="#calc"],a[href$="#zayavka"],[data-fmt],[data-open-drawer],[data-calc-cart]'))
      goal('mbl_cta', { place: t.matches('[data-cart]') ? 'cart' : t.matches('[data-fmt]') ? 'formats' : t.closest('.ktg-hero') ? 'hero' : (t.closest('section') || {}).id || '' });
    if (t.matches('[data-fmt]')) { goCalc(t.dataset.fmt); return; }
    if (t.matches('[data-fmt-set]')) { state.fmt = t.dataset.fmtSet; renderFormats(); renderSum(); return; }
    if (t.matches('[data-tier]')) { state.tier = t.dataset.tier; renderFormats(); renderSum(); return; }
    if (t.matches('[data-g]')) { setGuests(state.guests + +t.dataset.g); return; }
    if (t.matches('[data-add]')) { var a = t.dataset.add; state.adds[a] = !state.adds[a]; renderFormats(); renderSum(); return; }
    if (t.matches('[data-calc-cart]')) { toCart(t, calcItems()); return; }
    if (t.matches('[data-group]')) { setGroup(t.dataset.group, true); return; }
    if (t.matches('[data-more]')) { state.limit += 12; renderGrid(); return; }
    if (t.matches('[data-dd-btn]')) { dd.classList.toggle('is-open'); return; }
    if (t.matches('[data-sort]')) {
      state.sort = t.dataset.sort; $$('[data-sort]').forEach(function (b) { b.classList.toggle('is-on', b === t); });
      $('[data-dd-label]').textContent = t.textContent; dd.classList.remove('is-open'); renderGrid(); return;
    }
    if (t.matches('[data-pick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-qv-open]')) { openQv(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-qv-photo]') && matchMedia('(min-width:768px)').matches) {
      var main = $('[data-qv-img]'), was = main.src; main.src = t.dataset.qvPhoto; t.src = t.dataset.qvPhoto = was; return;
    }
    if (t.matches('[data-qv-photo]')) { $('[data-qv-img]').src = t.dataset.qvPhoto; $$('[data-qv-photo]').forEach(function (x) { x.classList.toggle('is-on', x === t); }); return; }
    if (t.matches('[data-qv-pick]')) { togglePick(+$('[data-qv]').dataset.id); return; }
    if (t.matches('[data-qv-prev]') && qvIndex > 0) { openQv(state.list[qvIndex - 1].id); return; }
    if (t.matches('[data-qv-next]') && qvIndex < state.list.length - 1) { openQv(state.list[qvIndex + 1].id); return; }
    if (t.matches('[data-q]')) { var qid = +t.closest('[data-id]').dataset.id; state.qty[qid] = Math.max(1, (state.qty[qid] || 1) + +t.dataset.q); savePicks(); renderDrawer(); return; }
    if (t.matches('[data-uncalc]')) { state.calcOn = false; renderDrawer(); return; }
    if (t.matches('[data-unpick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-to-cart]')) { toCart(t, drawerItems()); return; }
    if (t.matches('[data-open-drawer]')) { renderDrawer(); open($('[data-drawer]')); return; }
    if (t.matches('[data-close]')) { closeAll(); return; }
  });
  overlay.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
    if (!$('[data-qv]').classList.contains('is-open')) return;
    if (e.key === 'ArrowLeft' && qvIndex > 0) openQv(state.list[qvIndex - 1].id);
    if (e.key === 'ArrowRight' && qvIndex < state.list.length - 1) openQv(state.list[qvIndex + 1].id);
  });
  document.addEventListener('ktg:go', function (e) { closeAll(); setGroup(e.detail, true); });
  $('#calc').addEventListener('input', function () { state.calcOn = true; calcUse(); });
  $('[data-guests]').addEventListener('change', function () { setGuests(this.value); });
  $('[data-guests-range]').addEventListener('input', function () { setGuests(this.value); });
  var qt;
  $('[data-search]').addEventListener('input', function () {
    var v = this.value.trim(); clearTimeout(qt);
    qt = setTimeout(function () { state.q = v; state.limit = 12; renderGroups(); renderGrid(); }, 150);
  });

  // Заявки — на /_order.php, как у всех лендингов А+: name2 — ловушка для ботов, всегда пустой; расчёт и подборка — строками в text.
  var digits = function (s) { return (s || '').replace(/\D/g, ''); };
  function fmtPhone(d) {
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    return '+7' + (d.length > 1 ? ' (' + d.slice(1, 4) : '') + (d.length > 4 ? ') ' + d.slice(4, 7) : '') + (d.length > 7 ? '-' + d.slice(7, 9) : '') + (d.length > 9 ? '-' + d.slice(9, 11) : '');
  }
  function leadText(f) {
    var rows = state.calcOn ? [calcLine().join(' - ')] : [];
    rows = rows.concat(state.picks.map(function (id) { return byId[id].it.n + ' - ' + (state.qty[id] || 1) + ' шт - ' + byId[id].it.p; }));
    var extra = $$('.ktg-field', f).slice(2).map(function (x) { return x.value.trim(); }).filter(Boolean);
    return rows.concat(extra).join('\n').replace(/₽/g, 'руб.').replace(/["'<>«»]/g, '');
  }
  $$('[data-form]').forEach(function (f) {
    var ph = $('input[type="tel"]', f);
    ph.addEventListener('focus', function () { if (!ph.value) ph.value = '+7 '; });
    ph.addEventListener('blur', function () { if (digits(ph.value).length <= 1) ph.value = ''; });
    ph.addEventListener('input', function () { ph.value = fmtPhone(digits(ph.value)); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (digits(ph.value).length !== 11) { ph.setCustomValidity('Нужно 11 цифр'); ph.reportValidity(); ph.setCustomValidity(''); return; }
      var text = leadText(f), subject = f.closest('[data-drawer]') ? 'Мебель: подборка с лендинга' : 'Мебель: заявка с лендинга';
      var body = { tip: 'phone', name: $('input[type="text"]', f).value.trim(), name2: '', subject: subject, phone: ph.value, text: text, fav: 0 };
      fetch('/_order.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'same-origin',
        body: Object.keys(body).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(body[k]); }).join('&') }).catch(function () {});
      f.classList.add('is-sent');
      goal('mbl_lead', { form: f.closest('[data-drawer]') ? 'drawer' : 'zayavka' });
      try { if (window.Comagic && Comagic.addOfflineRequest) Comagic.addOfflineRequest({ name: body.name, email: '', phone: body.phone, message: subject + '. ' + text.replace(/\n/g, ' ') }); } catch (er) {}
    });
  });

  setGuests(50); renderGroups(); renderGrid(); renderPicksEverywhere();
})();
