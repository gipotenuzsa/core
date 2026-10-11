/* Отрисовка блоков: из узла AST делает DOM. Сам ничего не перетаскивает — этим занимается editor.js.
   У созданных элементов есть служебные поля:
     block._node  — узел AST;  block._loc — где он лежит ({list,item} | {slot} | {item});
     stack._list  — массив операторов;  slot._slot — { owner, key, index }. */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};
  var B = Core.Blocks, A = Core.AST;

  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  function slotGet(s) {
    var v = s.owner[s.key];
    return s.index === undefined ? v : v[s.index];
  }
  function slotSet(s, val) {
    if (s.index === undefined) s.owner[s.key] = val;
    else {
      while (s.owner[s.key].length <= s.index) s.owner[s.key].push(null);
      s.owner[s.key][s.index] = val;
    }
  }

  function fitWidth(input) {
    input.style.width = 'calc(' + Math.max(1, (input.value || input.placeholder || '').length * 1.15) + 'ch + 18px)';
  }

  // ctx: { inert: bool, onEdit(), onStructure() }
  function renderField(node, p, ctx) {
    var el;
    if (p.input === 'select' || p.argselect !== undefined) {
      el = h('select', 'fld');
      var cur;
      if (p.argselect !== undefined) {
        var a = node.args[p.argselect];
        cur = a && a.type === 'str' ? a.value : p.options[0];
      } else cur = String(node[p.field]);
      p.options.forEach(function (o) {
        var opt = h('option', null, Array.isArray(o) ? o[1] : o);
        opt.value = Array.isArray(o) ? o[0] : o;
        if (opt.value === cur) opt.selected = true;
        el.appendChild(opt);
      });
      el.addEventListener('change', function () {
        if (p.argselect !== undefined) node.args[p.argselect] = A.str(el.value);
        else node[p.field] = p.bool ? el.value === 'true' : el.value;
        ctx.onEdit();
      });
      return el;
    }
    el = h('input', 'fld');
    el.type = 'text';
    el.spellcheck = false;
    el.autocomplete = 'off';
    if (p.ph) el.placeholder = p.ph;
    if (p.input === 'params') el.value = node.params.join(', ');
    else el.value = node[p.field] === undefined || node[p.field] === null ? '' : String(node[p.field]);
    if (p.input === 'var') el.setAttribute('list', 'dl-vars');
    if (p.input === 'func') el.setAttribute('list', 'dl-funcs');
    if (p.input === 'num') el.className += ' num-fld';
    fitWidth(el);
    el.addEventListener('input', function () {
      if (p.input === 'num') {
        var n = parseFloat(el.value.replace(',', '.'));
        node[p.field] = isNaN(n) ? 0 : n;
      } else if (p.input === 'params') {
        node.params = el.value.split(/[,\s]+/).filter(Boolean);
      } else node[p.field] = el.value;
      fitWidth(el);
      ctx.onEdit();
    });
    el.addEventListener('keydown', function (e) { e.stopPropagation(); });
    return el;
  }

  function renderSlot(owner, key, index, ctx) {
    var s = h('span', 'slot');
    s._slot = { owner: owner, key: key, index: index };
    var val = slotGet(s._slot);
    if (val) {
      s.className += ' filled';
      s.appendChild(renderBlock(val, { slot: s._slot }, ctx));
    } else s.className += ' empty';
    return s;
  }

  function renderStack(list, item, ctx) {
    var st = h('div', 'stack');
    st._list = list;
    st._item = item || null;
    list.forEach(function (n) { st.appendChild(renderBlock(n, { list: list, item: item || null }, ctx)); });
    return st;
  }

  function renderBlock(node, loc, ctx) {
    var kind = B.kindOf(node);
    var el = h(kind === 'expr' ? 'span' : 'div', 'block ' + kind + ' cat-' + B.catOf(node));
    el._node = node;
    el._loc = loc;
    if (node.id) el.dataset.id = node.id;
    var badge = h('span', 'badge', node.id || '');
    var parts = B.partsOf(node);
    var row = kind === 'expr' ? el : h('div', 'row');
    var first = true;
    function flush() {
      if (row !== el && row.childNodes.length) el.appendChild(row);
    }
    if (kind === 'expr') row.appendChild(badge);
    else row.appendChild(badge);
    parts.forEach(function (p) {
      if (typeof p === 'string') {
        row.appendChild(h('span', 'lbl', p));
      } else if (p.stack) {
        flush();
        var body = h('div', 'cbody');
        body.appendChild(renderStack(node[p.stack], null, ctx));
        el.appendChild(body);
        row = h('div', 'row foot');
      } else if (p.slot) {
        row.appendChild(renderSlot(node, p.slot, p.index, ctx));
      } else if (p.slots) {
        node[p.slots].forEach(function (_, i) { row.appendChild(renderSlot(node, p.slots, i, ctx)); });
        var minus = h('button', 'mini', '−');
        var plus = h('button', 'mini', '+');
        minus.title = 'Убрать аргумент';
        plus.title = 'Добавить аргумент';
        minus.addEventListener('click', function () { node[p.slots].pop(); ctx.onStructure(); });
        plus.addEventListener('click', function () { node[p.slots].push(null); ctx.onStructure(); });
        row.appendChild(minus);
        row.appendChild(plus);
      } else {
        row.appendChild(renderField(node, p, ctx));
      }
      first = false;
    });
    flush();
    return el;
  }

  Core.Render = {
    block: renderBlock,
    stack: renderStack,
    slotGet: slotGet,
    slotSet: slotSet
  };
})(globalThis);
