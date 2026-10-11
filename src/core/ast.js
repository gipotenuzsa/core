/* Core: дерево программы (AST) и конструкторы узлов.
   Ядро ничего не знает ни об играх, ни о редакторе. */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};

  // Операции: op — внутреннее имя, label — как показывать, prec — приоритет для текста.
  var OPS = [
    { op: '+', label: '+', prec: 4 },
    { op: '-', label: '−', prec: 4 },
    { op: '*', label: '×', prec: 5 },
    { op: '/', label: '/', prec: 5 },
    { op: '%', label: 'остаток', prec: 5 },
    { op: '=', label: '=', prec: 3 },
    { op: '!=', label: '≠', prec: 3 },
    { op: '<', label: '<', prec: 3 },
    { op: '>', label: '>', prec: 3 },
    { op: '<=', label: '≤', prec: 3 },
    { op: '>=', label: '≥', prec: 3 },
    { op: 'and', label: 'и', prec: 2 },
    { op: 'or', label: 'или', prec: 1 }
  ];

  function opInfo(op) {
    for (var i = 0; i < OPS.length; i++) if (OPS[i].op === op) return OPS[i];
    return null;
  }

  // Приводит обычное значение JS к узлу выражения (для краткой записи программ).
  function e(x) {
    if (x === null || x === undefined) return null;
    if (typeof x === 'number') return { type: 'num', value: x };
    if (typeof x === 'string') return { type: 'str', value: x };
    if (typeof x === 'boolean') return { type: 'bool', value: x };
    return x;
  }

  var A = {
    OPS: OPS,
    opInfo: opInfo,

    // выражения
    num: function (value) { return { type: 'num', value: value }; },
    str: function (value) { return { type: 'str', value: value }; },
    bool: function (value) { return { type: 'bool', value: value }; },
    v: function (name) { return { type: 'var', name: name }; },
    bin: function (op, l, r) { return { type: 'bin', op: op, left: e(l), right: e(r) }; },
    not: function (x) { return { type: 'not', expr: e(x) }; },
    call: function (name) { return { type: 'call', name: name, args: Array.prototype.slice.call(arguments, 1).map(e) }; },

    // операторы
    let: function (name, value) { return { type: 'let', name: name, value: e(value) }; },
    assign: function (name, value) { return { type: 'assign', name: name, value: e(value) }; },
    change: function (name, value) { return { type: 'change', name: name, value: e(value) }; },
    if_: function (cond, then, els) { return { type: 'if', cond: e(cond), then: then || [], else: els || [] }; },
    repeat: function (count, body) { return { type: 'repeat', count: e(count), body: body || [] }; },
    while_: function (cond, body) { return { type: 'while', cond: e(cond), body: body || [] }; },
    func: function (name, params, body) { return { type: 'func', name: name, params: params || [], body: body || [] }; },
    ret: function (value) { return { type: 'return', value: e(value) }; },
    show: function (value) { return { type: 'show', value: e(value) }; },
    cs: function (name) { return { type: 'callstmt', name: name, args: Array.prototype.slice.call(arguments, 1).map(e) }; },
    on: function (event, body) { return { type: 'on', event: event, body: body || [] }; },

    program: function (body) { return { type: 'program', id: 0, body: body || [] }; }
  };

  // Дочерние узлы (и выражения, и операторы) в порядке обхода.
  A.children = function (node) {
    var out = [];
    Object.keys(node).forEach(function (k) {
      if (k === 'type' || k === 'id') return;
      var val = node[k];
      if (Array.isArray(val)) {
        val.forEach(function (x) { if (x && typeof x === 'object' && x.type) out.push(x); });
      } else if (val && typeof val === 'object' && val.type) {
        out.push(val);
      }
    });
    return out;
  };

  A.walk = function (node, fn) {
    fn(node);
    A.children(node).forEach(function (c) { A.walk(c, fn); });
  };

  // Нумерует блоки по порядку обхода (1, 2, 3…). Эти номера видны в сообщениях об ошибках.
  A.number = function (program) {
    var counter = 0;
    program.id = 0;
    A.children(program).forEach(function (c) {
      A.walk(c, function (n) { n.id = ++counter; });
    });
    return counter;
  };

  A.clone = function (node) {
    return JSON.parse(JSON.stringify(node, function (k, val) { return k === 'id' ? undefined : val; }));
  };

  Core.AST = A;
})(globalThis);
