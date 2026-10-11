/* Реестр блоков редактора: как выглядит каждый узел AST и что лежит в палитре.
   Описание блока:
     kind: 'stmt' | 'expr'
     cat:  id категории (для цвета)
     parts: массив частей или функция(node) → массив. Часть:
        'текст'                       — подпись
        { field, input, ... }         — поле ввода (num | text | var | func | params | select | argselect)
        { slot, index? }              — место для вложенного выражения
        { slots }                     — список выражений (аргументы вызова, кнопки + и −)
        { stack }                     — вложенный список операторов (внутри если, повторить…)
     templates: [{ cat, make }]       — что показывать в палитре */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};

  var CATEGORIES = [
    { id: 'values', name: 'Значения' },
    { id: 'vars', name: 'Переменные' },
    { id: 'logic', name: 'Условия' },
    { id: 'loops', name: 'Циклы' },
    { id: 'funcs', name: 'Функции' },
    { id: 'out', name: 'Вывод' },
    { id: 'world', name: 'Мир' }
  ];

  var specs = {};
  var builtins = {};
  var palette = [];

  function register(type, spec) {
    specs[type] = spec;
    (spec.templates || []).forEach(function (t) { palette.push({ cat: t.cat, make: t.make }); });
  }

  // Встроенная функция библиотеки: name, cat, kind ('expr' | 'stmt'), title, args: подписи, defaults: значения.
  function registerBuiltin(name, spec) {
    builtins[name] = spec;
    palette.push({
      cat: spec.cat,
      make: function () {
        var A = Core.AST;
        var node = { type: spec.kind === 'expr' ? 'call' : 'callstmt', name: name, args: [] };
        (spec.args || []).forEach(function (_, i) {
          var d = spec.defaults && spec.defaults[i];
          node.args.push(d === undefined ? null : A.clone(typeof d === 'object' ? d : (typeof d === 'number' ? A.num(d) : typeof d === 'boolean' ? A.bool(d) : A.str(d))));
        });
        return node;
      }
    });
  }

  function spec(node) { return specs[node.type] || null; }

  function kindOf(node) {
    if (node.type === 'call') return 'expr';
    if (node.type === 'callstmt') return 'stmt';
    var s = specs[node.type];
    return s ? s.kind : 'stmt';
  }

  function catOf(node) {
    if ((node.type === 'call' || node.type === 'callstmt') && builtins[node.name]) return builtins[node.name].cat;
    var s = specs[node.type];
    return s ? s.cat : 'values';
  }

  function partsOf(node) {
    var s = specs[node.type];
    if (!s) return ['неизвестный блок «' + node.type + '»'];
    return typeof s.parts === 'function' ? s.parts(node) : s.parts;
  }

  Core.Blocks = {
    CATEGORIES: CATEGORIES,
    register: register,
    registerBuiltin: registerBuiltin,
    spec: spec,
    kindOf: kindOf,
    catOf: catOf,
    partsOf: partsOf,
    builtins: builtins,
    // операторы идут раньше выражений, внутри — в порядке регистрации
    paletteFor: function (cat) {
      var list = palette.filter(function (p) { return p.cat === cat; });
      var stmts = list.filter(function (p) { return kindOf(p.make()) === 'stmt'; });
      var exprs = list.filter(function (p) { return kindOf(p.make()) === 'expr'; });
      return stmts.concat(exprs);
    }
  };
})(globalThis);
