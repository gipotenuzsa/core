/* Блочный редактор: палитра, рабочая область, перетаскивание мышью и касанием.
   Единственный источник правды — дерево AST в this.items:
     { x, y, nodes: [операторы] }  — стопка блоков
     { x, y, expr: узел }          — свободное выражение (при запуске игнорируется) */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};
  var B = Core.Blocks, A = Core.AST, R = Core.Render;

  var DRAG_START = 5;      // пикселей до начала перетаскивания
  var SNAP = 60;           // радиус примагничивания блока к месту вставки

  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function Editor(els, hooks) {
    this.paletteEl = els.palette;       // контейнер палитры (категории + список)
    this.catsEl = els.cats;
    this.listEl = els.list;
    this.ws = els.ws;                   // прокручиваемая рабочая область
    this.inner = els.inner;
    this.hooks = hooks || {};
    this.items = [];
    this.selected = null;
    this.cat = B.CATEGORIES[0].id;
    this.drag = null;
    this.ctx = {
      inert: false,
      onEdit: this.changed.bind(this),
      onStructure: this.render.bind(this)
    };
    this.paletteCtx = { inert: true, onEdit: function () {}, onStructure: function () {} };
    this.buildCats();
    this.buildPalette();
    this.bind();
    this.render();
  }

  // ---------- программа ----------

  Editor.prototype.getProgram = function () {
    var stacks = this.items.filter(function (it) { return it.nodes; });
    stacks.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var body = [];
    stacks.forEach(function (it) { body = body.concat(it.nodes); });
    return A.program(body);
  };

  // items: [{nodes:[...]}], позиции расставляются автоматически.
  Editor.prototype.setItems = function (items) {
    this.items = items.map(function (it, i) {
      return it.nodes ? { x: 16, y: 16, nodes: it.nodes } : { x: 16, y: 16, expr: it.expr };
    });
    this.selected = null;
    this.render();
    this.arrange();
  };

  Editor.prototype.arrange = function () {
    var self = this;
    var y = 16;
    var els = this.inner.querySelectorAll(':scope > .item');
    this.items.forEach(function (it, i) {
      it.x = 16; it.y = y;
      els[i].style.left = it.x + 'px';
      els[i].style.top = it.y + 'px';
      y += els[i].offsetHeight + 24;
    });
    this.fitInner();
    this.changed();
  };

  Editor.prototype.changed = function () {
    this.clearError();
    this.refreshNames();
    if (this.hooks.onChange) this.hooks.onChange();
  };

  // ---------- имена для подсказок ----------

  Editor.prototype.refreshNames = function () {
    var vars = {}, funcs = {};
    this.items.forEach(function (it) {
      (it.nodes ? it.nodes : [it.expr]).forEach(function (root) {
        A.walk(root, function (n) {
          if (n.type === 'let' && n.name) vars[n.name] = 1;
          if (n.type === 'func') {
            if (n.name) funcs[n.name] = 1;
            n.params.forEach(function (p) { vars[p] = 1; });
          }
        });
      });
    });
    function fill(id, obj) {
      var dl = document.getElementById(id);
      if (!dl) return;
      dl.innerHTML = '';
      Object.keys(obj).forEach(function (k) { var o = document.createElement('option'); o.value = k; dl.appendChild(o); });
    }
    fill('dl-vars', vars);
    fill('dl-funcs', funcs);
  };

  // ---------- палитра ----------

  Editor.prototype.buildCats = function () {
    var self = this;
    this.catsEl.innerHTML = '';
    B.CATEGORIES.forEach(function (c) {
      var b = h('button', 'cat cat-' + c.id, c.name);
      b.dataset.cat = c.id;
      b.addEventListener('click', function () { self.cat = c.id; self.buildPalette(); });
      self.catsEl.appendChild(b);
    });
  };

  Editor.prototype.buildPalette = function () {
    var self = this;
    Array.prototype.forEach.call(this.catsEl.children, function (b) {
      b.classList.toggle('active', b.dataset.cat === self.cat);
    });
    this.listEl.innerHTML = '';
    B.paletteFor(this.cat).forEach(function (p) {
      var wrap = h('div', 'pitem');
      wrap._make = p.make;
      wrap.appendChild(R.block(p.make(), {}, self.paletteCtx));
      self.listEl.appendChild(wrap);
    });
  };

  // ---------- отрисовка ----------

  Editor.prototype.render = function () {
    var self = this;
    this.inner.innerHTML = '';
    this.items.forEach(function (it) {
      var wrap = h('div', 'item');
      wrap.style.left = it.x + 'px';
      wrap.style.top = it.y + 'px';
      if (it.nodes) wrap.appendChild(R.stack(it.nodes, it, self.ctx));
      else wrap.appendChild(R.block(it.expr, { item: it }, self.ctx));
      wrap._item = it;
      self.inner.appendChild(wrap);
    });
    this.fitInner();
    this.paintSelection();
    this.refreshNames();
  };

  Editor.prototype.fitInner = function () {
    var w = 0, hgt = 0;
    Array.prototype.forEach.call(this.inner.children, function (el) {
      w = Math.max(w, el.offsetLeft + el.offsetWidth);
      hgt = Math.max(hgt, el.offsetTop + el.offsetHeight);
    });
    this.inner.style.minWidth = (w + 200) + 'px';
    this.inner.style.minHeight = (hgt + 200) + 'px';
  };

  Editor.prototype.paintSelection = function () {
    var sel = this.selected;
    Array.prototype.forEach.call(this.inner.querySelectorAll('.block'), function (el) {
      el.classList.toggle('selected', el._node === sel);
    });
  };

  Editor.prototype.select = function (node) {
    this.selected = node;
    this.paintSelection();
  };

  // ---------- подсветка выполнения и ошибок ----------

  Editor.prototype.flash = function (ids) {
    var els = [];
    Array.prototype.forEach.call(this.inner.querySelectorAll('.block[data-id]'), function (el) {
      if (ids.has(+el.dataset.id)) els.push(el);
    });
    els.forEach(function (el) { el.classList.add('run'); });
    setTimeout(function () { els.forEach(function (el) { el.classList.remove('run'); }); }, 450);
  };

  Editor.prototype.markError = function (id) {
    this.clearError();
    this.inner.classList.add('show-nums');
    var el = this.inner.querySelector('.block[data-id="' + id + '"]');
    if (el) {
      el.classList.add('error');
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  };

  Editor.prototype.clearError = function () {
    var errs = this.inner.querySelectorAll('.block.error');
    Array.prototype.forEach.call(errs, function (el) { el.classList.remove('error'); });
    this.inner.classList.remove('show-nums');
  };

  // ---------- удаление / вставка ----------

  Editor.prototype.removeItem = function (it) {
    var i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
  };

  // Вынимает блок (и для операторов — всё, что идёт после него в стопке, если withRest).
  Editor.prototype.detach = function (node, loc, withRest) {
    if (loc.slot) {
      R.slotSet(loc.slot, null);
      return [node];
    }
    if (loc.list) {
      var i = loc.list.indexOf(node);
      var taken = loc.list.splice(i, withRest ? loc.list.length - i : 1);
      if (loc.item && !loc.list.length) this.removeItem(loc.item);
      return taken;
    }
    if (loc.item) this.removeItem(loc.item);
    return [node];
  };

  Editor.prototype.deleteSelected = function () {
    var node = this.selected;
    if (!node) return;
    var el = null;
    Array.prototype.forEach.call(this.inner.querySelectorAll('.block'), function (b) { if (b._node === node) el = b; });
    if (!el) return;
    this.detach(node, el._loc, false);
    this.selected = null;
    this.render();
    this.changed();
  };

  // Добавить блок из палитры в конец рабочей области (по клику или касанию).
  Editor.prototype.addFromPalette = function (make) {
    var y = 16;
    Array.prototype.forEach.call(this.inner.children, function (el) {
      y = Math.max(y, el.offsetTop + el.offsetHeight + 24);
    });
    var node = make();
    this.items.push(B.kindOf(node) === 'expr' ? { x: 16, y: y, expr: node } : { x: 16, y: y, nodes: [node] });
    this.render();
    this.select(node);
    this.changed();
    this.ws.scrollTop = this.ws.scrollHeight;
  };

  // ---------- перетаскивание ----------

  Editor.prototype.bind = function () {
    var self = this;
    this.paletteEl.addEventListener('pointerdown', function (e) {
      var item = e.target.closest('.pitem');
      if (!item || e.button !== 0) return;
      self.press(e, { palette: true, make: item._make, el: item });
    });
    this.ws.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('input, select, button')) return;
      var block = e.target.closest('.block');
      if (!block) { self.select(null); return; }
      self.press(e, { palette: false, el: block });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Delete' && !e.target.closest('input, select, textarea')) {
        e.preventDefault();
        self.deleteSelected();
      }
    });
  };

  Editor.prototype.press = function (e, source) {
    var self = this;
    e.preventDefault();
    var st = { x: e.clientX, y: e.clientY, source: source, dragging: false, id: e.pointerId };
    this.drag = st;
    function move(ev) { self.onMove(ev); }
    function up(ev) {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      self.onUp(ev);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  Editor.prototype.onMove = function (e) {
    var d = this.drag;
    if (!d) return;
    if (!d.dragging) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_START) return;
      this.startDrag(e);
    }
    this.moveGhost(e);
  };

  Editor.prototype.startDrag = function (e) {
    var d = this.drag, src = d.source;
    d.dragging = true;
    var rect = src.el.getBoundingClientRect();
    d.grabX = Math.min(Math.max(d.x - rect.left, 0), rect.width);
    d.grabY = Math.min(Math.max(d.y - rect.top, 0), rect.height);
    if (src.palette) {
      d.nodes = [src.make()];
    } else {
      d.nodes = this.detach(src.el._node, src.el._loc, B.kindOf(src.el._node) === 'stmt');
      this.selected = null;
      this.render();
    }
    d.kind = B.kindOf(d.nodes[0]);
    var ghost = h('div', 'ghost');
    if (d.kind === 'expr') ghost.appendChild(R.block(d.nodes[0], {}, this.paletteCtx));
    else ghost.appendChild(R.stack(d.nodes, null, this.paletteCtx));
    document.body.appendChild(ghost);
    d.ghost = ghost;
    d.line = h('div', 'drop-line');
    d.line.hidden = true;
    document.body.appendChild(d.line);
    document.body.classList.add('dragging');
  };

  Editor.prototype.moveGhost = function (e) {
    var d = this.drag;
    d.ghost.style.transform = 'translate(' + (e.clientX - d.grabX) + 'px,' + (e.clientY - d.grabY) + 'px)';
    var over = this.overPalette(e);
    d.ghost.classList.toggle('trash', over);
    this.paintTarget(over ? null : this.findTarget(e));
  };

  Editor.prototype.overPalette = function (e) {
    var r = this.paletteEl.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };

  // Ищет место вставки. Операторы — между блоками стопок, выражения — в пустых слотах.
  Editor.prototype.findTarget = function (e) {
    var d = this.drag;
    var best = null, bestScore = Infinity;
    if (d.kind === 'expr') {
      Array.prototype.forEach.call(this.inner.querySelectorAll('.slot.empty'), function (s) {
        var r = s.getBoundingClientRect();
        var pad = 8;
        if (e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) {
          var score = r.width * r.height;
          if (score < bestScore) { bestScore = score; best = { slot: s._slot, el: s }; }
        }
      });
      return best;
    }
    var gx = e.clientX - d.grabX, gy = e.clientY - d.grabY;
    Array.prototype.forEach.call(this.inner.querySelectorAll('.stack'), function (st) {
      var sr = st.getBoundingClientRect();
      var kids = Array.prototype.filter.call(st.children, function (c) { return c.classList.contains('block'); });
      for (var i = 0; i <= kids.length; i++) {
        var y;
        if (i < kids.length) y = kids[i].getBoundingClientRect().top;
        else if (kids.length) y = kids[kids.length - 1].getBoundingClientRect().bottom;
        else y = sr.top + 4;
        var score = Math.hypot(gx - sr.left, gy - y);
        if (score < bestScore && score < SNAP) {
          bestScore = score;
          best = { list: st._list, item: st._item, index: i, x: sr.left, y: y, w: Math.max(sr.width, 80) };
        }
      }
    });
    return best;
  };

  Editor.prototype.paintTarget = function (t) {
    var d = this.drag;
    if (d.hot) { d.hot.classList.remove('hot'); d.hot = null; }
    d.target = t;
    if (!t) { d.line.hidden = true; return; }
    if (t.slot) {
      t.el.classList.add('hot');
      d.hot = t.el;
      d.line.hidden = true;
    } else {
      d.line.hidden = false;
      d.line.style.left = t.x + 'px';
      d.line.style.top = (t.y - 1) + 'px';
      d.line.style.width = t.w + 'px';
    }
  };

  Editor.prototype.onUp = function (e) {
    var d = this.drag;
    this.drag = null;
    if (!d) return;
    if (!d.dragging) {
      // обычный клик
      if (d.source.palette) this.addFromPalette(d.source.make);
      else this.select(d.source.el._node);
      return;
    }
    var target = d.target;
    var gx = e.clientX - d.grabX, gy = e.clientY - d.grabY;
    var trash = this.overPalette(e);
    if (d.hot) d.hot.classList.remove('hot');
    d.ghost.remove();
    d.line.remove();
    document.body.classList.remove('dragging');

    if (!trash) {
      if (target && target.slot) {
        R.slotSet(target.slot, d.nodes[0]);
      } else if (target) {
        // вставляем оператор(ы) в стопку; для нового списка внутри item ссылка остаётся прежней
        var args = [target.index, 0].concat(d.nodes);
        Array.prototype.splice.apply(target.list, args);
      } else {
        var ir = this.inner.getBoundingClientRect();
        var x = Math.max(4, gx - ir.left), y = Math.max(4, gy - ir.top);
        this.items.push(d.kind === 'expr' ? { x: x, y: y, expr: d.nodes[0] } : { x: x, y: y, nodes: d.nodes });
      }
      this.selected = d.nodes[0];
    } else {
      this.selected = null;
    }
    this.render();
    this.changed();
  };

  Core.Editor = Editor;
})(globalThis);
