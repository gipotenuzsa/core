/* Core: интерпретатор дерева программы.
   Знает только ядро языка. Всё остальное (всё, что не входит в сам язык) приходит снаружи
   как набор встроенных функций: { имя: { arity, fn } }. */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};

  var MAX_DEPTH = 100;

  function CoreError(message, blockId) {
    this.name = 'CoreError';
    this.message = message;
    this.blockId = blockId || 0;
    this.stack = (new Error(message)).stack;
  }
  CoreError.prototype = Object.create(Error.prototype);
  CoreError.prototype.constructor = CoreError;
  CoreError.prototype.format = function () {
    return this.blockId ? 'Ошибка в блоке №' + this.blockId + ': ' + this.message : 'Ошибка: ' + this.message;
  };

  function typeName(v) {
    if (v === null || v === undefined) return 'пусто';
    if (typeof v === 'number') return 'число';
    if (typeof v === 'string') return 'текст';
    if (typeof v === 'boolean') return 'логическое значение';
    return 'неизвестное';
  }

  function format(v) {
    if (v === null || v === undefined) return 'пусто';
    if (typeof v === 'boolean') return v ? 'истина' : 'ложь';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toFixed(10));
    return String(v);
  }

  function describe(v) {
    if (typeof v === 'string') return 'текст «' + v + '»';
    if (v === null || v === undefined) return 'пусто';
    return typeName(v) + ' ' + format(v);
  }

  function Scope(parent) {
    this.vars = new Map();
    this.parent = parent || null;
  }
  Scope.prototype.find = function (name) {
    for (var s = this; s; s = s.parent) if (s.vars.has(name)) return s;
    return null;
  };

  var RETURN = 'return';

  function Interpreter(program, opts) {
    opts = opts || {};
    this.program = program;
    this.output = opts.output || function () {};
    this.maxSteps = opts.maxSteps || 1000000;
    this.builtins = opts.builtins || {};
    this.onBlock = opts.onBlock || null;
    this.globals = new Scope(null);
    this.funcs = new Map();
    this.handlers = new Map();
    this.steps = 0;
    this.depth = 0;
  }

  Interpreter.prototype.tick = function (n) {
    if (++this.steps > this.maxSteps) {
      throw new CoreError('Превышен лимит шагов (' + this.maxSteps + '). Похоже, программа зациклилась — проверьте условие цикла.', n.id);
    }
    if (this.onBlock && n.id) this.onBlock(n.id);
  };

  // Запуск основной программы: все функции объявляются заранее, потом выполняются операторы.
  Interpreter.prototype.run = function () {
    var body = this.program.body;
    this.steps = 0;
    this.depth = 0;
    for (var i = 0; i < body.length; i++) {
      if (body[i].type === 'func') this.defineFunc(body[i]);
    }
    this.execBlock(body, this.globals);
  };

  // Запуск обработчика события (его регистрирует блок «on»). Возвращает false, если обработчика нет.
  Interpreter.prototype.runHandler = function (event, maxSteps) {
    var h = this.handlers.get(event);
    if (!h) return false;
    this.steps = 0;
    this.depth = 0;
    var saved = this.maxSteps;
    if (maxSteps) this.maxSteps = maxSteps;
    try {
      this.execBlock(h.body, new Scope(this.globals));
    } finally {
      this.maxSteps = saved;
    }
    return true;
  };

  Interpreter.prototype.defineFunc = function (n) {
    if (!n.name) throw new CoreError('У функции нет имени.', n.id);
    this.funcs.set(n.name, n);
  };

  Interpreter.prototype.execBlock = function (list, scope) {
    for (var i = 0; i < list.length; i++) {
      var r = this.exec(list[i], scope);
      if (r) return r;
    }
    return null;
  };

  Interpreter.prototype.needName = function (n) {
    if (!n.name) throw new CoreError('Не указано имя переменной.', n.id);
  };

  Interpreter.prototype.lookupVar = function (n, scope) {
    var s = scope.find(n.name);
    if (!s) throw new CoreError('Переменная «' + n.name + '» не создана. Сначала используйте блок «переменная».', n.id);
    return s;
  };

  // Текущая область видимости нужна выражениям; операторы получают её явно.
  Interpreter.prototype.exec = function (n, scope) {
    var saved = this.curScope;
    this.curScope = scope;
    try {
      return this.execNode(n, scope);
    } finally {
      this.curScope = saved;
    }
  };

  Interpreter.prototype.execNode = function (n, scope) {
    this.tick(n);
    var s, val, i, r;
    switch (n.type) {
      case 'let':
        this.needName(n);
        scope.vars.set(n.name, this.ev(n.value, n));
        return null;
      case 'assign':
        this.needName(n);
        s = this.lookupVar(n, scope);
        s.vars.set(n.name, this.ev(n.value, n));
        return null;
      case 'change':
        this.needName(n);
        s = this.lookupVar(n, scope);
        val = this.ev(n.value, n);
        s.vars.set(n.name, this.arith('+', s.vars.get(n.name), val, n));
        return null;
      case 'if':
        if (this.cond(n.cond, n)) return this.execBlock(n.then, scope);
        return this.execBlock(n.else, scope);
      case 'repeat': {
        var cnt = this.ev(n.count, n);
        if (typeof cnt !== 'number') throw new CoreError('Число повторений должно быть числом, а получено: ' + describe(cnt) + '.', n.id);
        cnt = Math.floor(cnt);
        for (i = 0; i < cnt; i++) {
          this.tick(n);
          r = this.execBlock(n.body, scope);
          if (r) return r;
        }
        return null;
      }
      case 'while':
        while (this.cond(n.cond, n)) {
          this.tick(n);
          r = this.execBlock(n.body, scope);
          if (r) return r;
        }
        return null;
      case 'func':
        this.defineFunc(n);
        return null;
      case 'return':
        if (this.depth === 0) throw new CoreError('Блок «вернуть» можно использовать только внутри функции.', n.id);
        return { kind: RETURN, value: n.value ? this.ev(n.value, n) : null };
      case 'show':
        this.output(format(this.ev(n.value, n)));
        return null;
      case 'callstmt':
        this.call(n, scope);
        return null;
      case 'on':
        if (!n.event) throw new CoreError('У обработчика не указано событие.', n.id);
        this.handlers.set(n.event, n);
        return null;
      default:
        throw new CoreError('Неизвестный блок «' + n.type + '».', n.id);
    }
  };

  Interpreter.prototype.cond = function (expr, owner) {
    var c = this.ev(expr, owner);
    if (typeof c !== 'boolean') {
      throw new CoreError('Условие должно быть логическим значением (истина/ложь), а получено: ' + describe(c) + '.', owner.id);
    }
    return c;
  };

  Interpreter.prototype.ev = function (n, owner) {
    if (!n) throw new CoreError('Не заполнено значение: в блоке есть пустое место.', owner && owner.id);
    this.tick(n);
    var a, b;
    switch (n.type) {
      case 'num': case 'str': case 'bool':
        return n.value;
      case 'var': {
        if (!n.name) throw new CoreError('Не указано имя переменной.', n.id);
        var s = this.curScope.find(n.name);
        if (!s) throw new CoreError('Переменная «' + n.name + '» не создана.', n.id);
        return s.vars.get(n.name);
      }
      case 'not':
        a = this.ev(n.expr, n);
        if (typeof a !== 'boolean') throw new CoreError('Операция «не» работает с логическим значением, а получено: ' + describe(a) + '.', n.id);
        return !a;
      case 'bin':
        if (n.op === 'and' || n.op === 'or') {
          a = this.ev(n.left, n);
          this.needBool(a, n);
          if (n.op === 'and' && !a) return false;
          if (n.op === 'or' && a) return true;
          b = this.ev(n.right, n);
          this.needBool(b, n);
          return b;
        }
        a = this.ev(n.left, n);
        b = this.ev(n.right, n);
        return this.arith(n.op, a, b, n);
      case 'call':
        return this.call(n);
      default:
        throw new CoreError('Блок «' + n.type + '» нельзя использовать как значение.', n.id);
    }
  };

  Interpreter.prototype.needBool = function (v, n) {
    if (typeof v !== 'boolean') {
      throw new CoreError('Операция «' + (n.op === 'and' ? 'и' : 'или') + '» работает с логическими значениями, а получено: ' + describe(v) + '.', n.id);
    }
  };

  Interpreter.prototype.arith = function (op, a, b, n) {
    var label = Core.AST.opInfo(op) ? Core.AST.opInfo(op).label : op;
    switch (op) {
      case '=': return a === b;
      case '!=': return a !== b;
      case '<': case '>': case '<=': case '>=':
        if (!((typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string'))) {
          throw new CoreError('Сравнивать «' + label + '» можно два числа или два текста, а получено: ' + describe(a) + ' и ' + describe(b) + '.', n.id);
        }
        if (op === '<') return a < b;
        if (op === '>') return a > b;
        if (op === '<=') return a <= b;
        return a >= b;
      case '+':
        if (typeof a === 'number' && typeof b === 'number') return a + b;
        if (typeof a === 'string' || typeof b === 'string') {
          if ((a === null || b === null)) break;
          return format(a) + format(b);
        }
        break;
      case '-': case '*': case '/': case '%':
        if (typeof a === 'number' && typeof b === 'number') {
          if (op === '-') return a - b;
          if (op === '*') return a * b;
          if (b === 0) throw new CoreError(op === '/' ? 'Деление на ноль.' : 'Остаток от деления на ноль.', n.id);
          return op === '/' ? a / b : a % b;
        }
        break;
      default:
        throw new CoreError('Неизвестная операция «' + op + '».', n.id);
    }
    throw new CoreError('Операция «' + label + '» не работает с такими значениями: ' + describe(a) + ' и ' + describe(b) + '.', n.id);
  };

  // Вызов функции (и как выражение, и как оператор).
  Interpreter.prototype.call = function (n) {
    var self = this;
    if (!n.name) throw new CoreError('Не указано имя функции.', n.id);
    var args = n.args.map(function (a) { return self.ev(a, n); });
    var f = this.funcs.get(n.name);
    if (f) {
      if (args.length !== f.params.length) {
        throw new CoreError('Функция «' + n.name + '» ожидает аргументов: ' + f.params.length + ', а передано: ' + args.length + '.', n.id);
      }
      if (this.depth >= MAX_DEPTH) throw new CoreError('Слишком глубокая рекурсия: функция «' + n.name + '» вызывает себя без остановки.', n.id);
      var local = new Scope(this.globals);
      f.params.forEach(function (p, i) { local.vars.set(p, args[i]); });
      var saved = this.curScope;
      this.curScope = local;
      this.depth++;
      try {
        var r = this.execBlock(f.body, local);
      } finally {
        this.depth--;
        this.curScope = saved;
      }
      return r && r.kind === RETURN ? r.value : null;
    }
    if (Object.prototype.hasOwnProperty.call(this.builtins, n.name)) {
      var b = this.builtins[n.name];
      if (b.arity !== undefined && args.length !== b.arity) {
        throw new CoreError('Функция «' + n.name + '» ожидает аргументов: ' + b.arity + ', а передано: ' + args.length + '.', n.id);
      }
      try {
        var res = b.fn.apply(null, args);
        return res === undefined ? null : res;
      } catch (err) {
        if (err instanceof CoreError) throw err;
        throw new CoreError(err.message, n.id);
      }
    }
    throw new CoreError('Неизвестная функция «' + n.name + '».', n.id);
  };

  Core.CoreError = CoreError;
  Core.Interpreter = Interpreter;
  Core.format = format;
})(globalThis);
