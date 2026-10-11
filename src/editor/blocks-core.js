/* Описания блоков ядра языка (никаких игровых блоков здесь нет). */
(function (g) {
  'use strict';
  var Core = g.Core;
  var B = Core.Blocks, A = Core.AST;

  var ALL_OPS = A.OPS.map(function (o) { return [o.op, o.label]; });

  function bin(op) { return function () { return A.bin(op, null, null); }; }

  B.register('num', {
    kind: 'expr', cat: 'values',
    parts: [{ field: 'value', input: 'num' }],
    templates: [{ cat: 'values', make: function () { return A.num(0); } }]
  });
  B.register('str', {
    kind: 'expr', cat: 'values',
    parts: ['«', { field: 'value', input: 'text', ph: 'текст' }, '»'],
    templates: [{ cat: 'values', make: function () { return A.str('привет'); } }]
  });
  B.register('bool', {
    kind: 'expr', cat: 'values',
    parts: [{ field: 'value', input: 'select', bool: true, options: [['true', 'истина'], ['false', 'ложь']] }],
    templates: [{ cat: 'values', make: function () { return A.bool(true); } }]
  });
  B.register('var', {
    kind: 'expr', cat: 'vars',
    parts: [{ field: 'name', input: 'var', ph: 'имя' }],
    templates: [{ cat: 'vars', make: function () { return A.v('x'); } }]
  });
  B.register('bin', {
    kind: 'expr', cat: 'values',
    parts: [{ slot: 'left' }, { field: 'op', input: 'select', options: ALL_OPS }, { slot: 'right' }],
    templates: [
      { cat: 'values', make: bin('+') },
      { cat: 'values', make: bin('-') },
      { cat: 'values', make: bin('*') },
      { cat: 'values', make: bin('/') },
      { cat: 'values', make: bin('%') },
      { cat: 'logic', make: bin('=') },
      { cat: 'logic', make: bin('!=') },
      { cat: 'logic', make: bin('<') },
      { cat: 'logic', make: bin('>') },
      { cat: 'logic', make: bin('<=') },
      { cat: 'logic', make: bin('>=') },
      { cat: 'logic', make: bin('and') },
      { cat: 'logic', make: bin('or') }
    ]
  });
  B.register('not', {
    kind: 'expr', cat: 'logic',
    parts: ['не', { slot: 'expr' }],
    templates: [{ cat: 'logic', make: function () { return A.not(null); } }]
  });

  B.register('let', {
    kind: 'stmt', cat: 'vars',
    parts: ['переменная', { field: 'name', input: 'var', ph: 'имя' }, '=', { slot: 'value' }],
    templates: [{ cat: 'vars', make: function () { return A.let('x', 0); } }]
  });
  B.register('change', {
    kind: 'stmt', cat: 'vars',
    parts: ['изменить', { field: 'name', input: 'var', ph: 'имя' }, 'на', { slot: 'value' }],
    templates: [{ cat: 'vars', make: function () { return A.change('x', 1); } }]
  });
  B.register('assign', {
    kind: 'stmt', cat: 'vars',
    parts: ['присвоить', { field: 'name', input: 'var', ph: 'имя' }, '=', { slot: 'value' }],
    templates: [{ cat: 'vars', make: function () { return A.assign('x', 0); } }]
  });

  B.register('if', {
    kind: 'stmt', cat: 'logic',
    parts: ['если', { slot: 'cond' }, 'то', { stack: 'then' }, 'иначе', { stack: 'else' }],
    templates: [{ cat: 'logic', make: function () { return A.if_(null, [], []); } }]
  });
  B.register('repeat', {
    kind: 'stmt', cat: 'loops',
    parts: ['повторить', { slot: 'count' }, 'раз', { stack: 'body' }],
    templates: [{ cat: 'loops', make: function () { return A.repeat(10, []); } }]
  });
  B.register('while', {
    kind: 'stmt', cat: 'loops',
    parts: ['пока', { slot: 'cond' }, { stack: 'body' }],
    templates: [{ cat: 'loops', make: function () { return A.while_(null, []); } }]
  });

  B.register('func', {
    kind: 'stmt', cat: 'funcs',
    parts: ['функция', { field: 'name', input: 'text', ph: 'имя' }, '(', { field: 'params', input: 'params', ph: 'параметры' }, ')', { stack: 'body' }],
    templates: [{ cat: 'funcs', make: function () { return A.func('моя_функция', [], []); } }]
  });
  B.register('return', {
    kind: 'stmt', cat: 'funcs',
    parts: ['вернуть', { slot: 'value' }],
    templates: [{ cat: 'funcs', make: function () { return A.ret(null); } }]
  });

  // Вызов функции: либо встроенной (по описанию из библиотеки), либо пользовательской.
  function callParts(node) {
    var b = B.builtins[node.name];
    if (!b) return ['вызвать', { field: 'name', input: 'func', ph: 'имя' }, '(', { slots: 'args' }, ')'];
    var parts = [b.title];
    (b.args || []).forEach(function (label, i) {
      if (b.options && b.options[i]) parts.push({ argselect: i, options: b.options[i] });
      else {
        if (label) parts.push(label);
        parts.push({ slot: 'args', index: i });
      }
    });
    return parts;
  }
  B.register('call', {
    kind: 'expr', cat: 'funcs', parts: callParts,
    templates: [{ cat: 'funcs', make: function () { return { type: 'call', name: '', args: [] }; } }]
  });
  B.register('callstmt', {
    kind: 'stmt', cat: 'funcs', parts: callParts,
    templates: [{ cat: 'funcs', make: function () { return { type: 'callstmt', name: '', args: [] }; } }]
  });

  B.register('show', {
    kind: 'stmt', cat: 'out',
    parts: ['показать', { slot: 'value' }],
    templates: [{ cat: 'out', make: function () { return A.show('Привет!'); } }]
  });
})(globalThis);
