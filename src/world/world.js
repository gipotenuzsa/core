/* Библиотека «Мир»: холст, клавиатура, таймер, случайные числа и цикл кадров.
   Подключается к ядру только как набор встроенных функций (world.builtins) —
   ядро ничего не знает ни об этом файле, ни об играх. */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};

  var FRAME_MS = 1000 / 60;
  var FRAME_STEPS = 200000;      // лимит шагов интерпретатора на один кадр
  var EVENT = 'кадр';

  var COLORS = {
    'синий': '#5b8cff', 'красный': '#ff6b6b', 'белый': '#e8ecf2', 'чёрный': '#0e1014',
    'серый': '#6b7482', 'зелёный': '#4fd1a5', 'жёлтый': '#e6c35c', 'фон': '#10131a'
  };

  var KEYS = {
    'влево': ['ArrowLeft', 'KeyA'],
    'вправо': ['ArrowRight', 'KeyD'],
    'вверх': ['ArrowUp', 'KeyW'],
    'вниз': ['ArrowDown', 'KeyS'],
    'пробел': ['Space']
  };
  var TRACKED = {};
  Object.keys(KEYS).forEach(function (k) { KEYS[k].forEach(function (c) { TRACKED[c] = true; }); });

  function color(c) {
    if (typeof c !== 'string') throw new Error('Цвет должен быть текстом: название («синий») или код («#ff0000»).');
    return Object.prototype.hasOwnProperty.call(COLORS, c) ? COLORS[c] : c;
  }

  function number(v, what) {
    if (typeof v !== 'number') throw new Error(what + ' должно быть числом, а получено: ' + Core.format(v) + '.');
    return v;
  }

  // opts: { canvas, ctx?, now?, random?, raf?, caf?, target? (откуда слушать клавиши; null — не слушать) }
  function create(opts) {
    var canvas = opts.canvas;
    var ctx = opts.ctx || canvas.getContext('2d');
    var now = opts.now || function () { return performance.now(); };
    var random = opts.random || Math.random;
    var raf = opts.raf || function (f) { return g.requestAnimationFrame(f); };
    var caf = opts.caf || function (h) { g.cancelAnimationFrame(h); };
    var target = opts.target === undefined ? g : opts.target;

    var down = {};
    var startTime = now();
    var loop = null;

    function textAt(align) {
      return function (text, x, y, size, c) {
        number(x, 'Координата x'); number(y, 'Координата y'); number(size, 'Размер');
        ctx.font = '600 ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
        ctx.textBaseline = 'top';
        ctx.textAlign = align;
        ctx.fillStyle = color(c);
        ctx.fillText(Core.format(text), x, y);
      };
    }

    var builtins = {
      'холст': { arity: 2, fn: function (w, h) {
        number(w, 'Ширина'); number(h, 'Высота');
        canvas.width = Math.max(50, Math.min(1200, Math.round(w)));
        canvas.height = Math.max(50, Math.min(1200, Math.round(h)));
      } },
      'очистить': { arity: 1, fn: function (c) {
        ctx.fillStyle = color(c);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } },
      'прямоугольник': { arity: 5, fn: function (x, y, w, h, c) {
        number(x, 'Координата x'); number(y, 'Координата y'); number(w, 'Ширина'); number(h, 'Высота');
        ctx.fillStyle = color(c);
        ctx.fillRect(x, y, w, h);
      } },
      'надпись': { arity: 5, fn: textAt('left') },
      'надпись_по_центру': { arity: 5, fn: textAt('center') },
      'клавиша': { arity: 1, fn: function (name) {
        if (!Object.prototype.hasOwnProperty.call(KEYS, name)) {
          throw new Error('Неизвестная клавиша «' + Core.format(name) + '». Доступны: ' + Object.keys(KEYS).join(', ') + '.');
        }
        return KEYS[name].some(function (code) { return !!down[code]; });
      } },
      'таймер': { arity: 0, fn: function () { return (now() - startTime) / 1000; } },
      'случайное': { arity: 2, fn: function (a, b) {
        number(a, 'Начало диапазона'); number(b, 'Конец диапазона');
        var lo = Math.ceil(a), hi = Math.floor(b);
        if (hi < lo) throw new Error('В диапазоне от ' + Core.format(a) + ' до ' + Core.format(b) + ' нет целых чисел.');
        return Math.floor(random() * (hi - lo + 1)) + lo;
      } },
      'целое': { arity: 1, fn: function (x) { return Math.floor(number(x, 'Аргумент')); } }
    };

    // ----- клавиатура -----
    function typing(e) {
      var t = e.target;
      return t && t.closest && t.closest('input, select, textarea');
    }
    function onDown(e) {
      if (!TRACKED[e.code] || typing(e)) return;
      e.preventDefault();
      down[e.code] = true;
    }
    function onUp(e) {
      if (TRACKED[e.code]) down[e.code] = false;
    }
    function onBlur() { down = {}; }
    if (target) {
      target.addEventListener('keydown', onDown);
      target.addEventListener('keyup', onUp);
      target.addEventListener('blur', onBlur);
    }

    // ----- цикл кадров: блок «каждый кадр» выполняется ~60 раз в секунду -----
    function stopLoop() {
      if (loop !== null) { caf(loop); loop = null; }
    }

    function startLoop(interp, hooks) {
      var last = now(), acc = 0;
      function frame() {
        var t = now();
        acc = Math.min(acc + (t - last), 250);   // после паузы не пытаемся «догнать» все кадры
        last = t;
        try {
          while (acc >= FRAME_MS) {
            interp.runHandler(EVENT, FRAME_STEPS);
            acc -= FRAME_MS;
          }
        } catch (err) {
          stopLoop();
          if (hooks && hooks.onError) hooks.onError(err);
          return;
        }
        loop = raf(frame);
      }
      loop = raf(frame);
    }

    function dispose() {
      stopLoop();
      if (target) {
        target.removeEventListener('keydown', onDown);
        target.removeEventListener('keyup', onUp);
        target.removeEventListener('blur', onBlur);
      }
    }

    return {
      builtins: builtins,
      startLoop: startLoop,
      stopLoop: stopLoop,
      dispose: dispose,
      // для тестов и отладки
      press: function (code) { down[code] = true; },
      release: function (code) { down[code] = false; },
      frames: function (interp, n, advance) {
        for (var i = 0; i < n; i++) {
          if (advance) advance(FRAME_MS);
          interp.runHandler(EVENT, FRAME_STEPS);
        }
      }
    };
  }

  // Поддельный холст и часы — чтобы проверять программы без браузера.
  function createFake() {
    var calls = [];
    var ctx = {
      fillRect: function (x, y, w, h) { calls.push(['rect', x, y, w, h, ctx.fillStyle]); },
      fillText: function (t, x, y) { calls.push(['text', t, x, y, ctx.fillStyle]); }
    };
    var canvas = { width: 480, height: 360, getContext: function () { return ctx; } };
    var time = 0, seed = 12345;
    var world = create({
      canvas: canvas, ctx: ctx, target: null,
      now: function () { return time; },
      random: function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    });
    var frames = world.frames;
    world.frames = function (interp, n) { frames(interp, n, function (ms) { time += ms; }); };
    world.calls = calls;
    world.canvas = canvas;
    world.advance = function (ms) { time += ms; };
    return world;
  }

  function clearCanvas(canvas) {
    canvas.width = 480;
    canvas.height = 360;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = COLORS['фон'];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  Core.World = { create: create, createFake: createFake, clearCanvas: clearCanvas, EVENT: EVENT, COLORS: COLORS };
})(globalThis);
