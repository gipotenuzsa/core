/* Сборка приложения: редактор + интерпретатор + панели вывода. */
(function (g) {
  'use strict';
  var Core = g.Core;
  var A = Core.AST;
  function $(id) { return document.getElementById(id); }

  var outEl = $('out'), codeEl = $('code'), statusEl = $('status'), canvas = $('canvas');
  var running = null;      // { world, interp } пока идёт цикл кадров
  var codeQueued = false;

  var editor = new Core.Editor(
    { palette: $('palette'), cats: $('cats'), list: $('plist'), ws: $('ws'), inner: $('ws-inner') },
    { onChange: queueCode }
  );

  function println(text, cls) {
    var line = document.createElement('div');
    line.className = 'line' + (cls ? ' ' + cls : '');
    line.textContent = text;
    outEl.appendChild(line);
    outEl.scrollTop = outEl.scrollHeight;
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + (cls || '');
  }

  function queueCode() {
    if (codeQueued) return;
    codeQueued = true;
    requestAnimationFrame(function () {
      codeQueued = false;
      codeEl.textContent = Core.codegen(editor.getProgram()) || '// Пока пусто: перетащите блоки в рабочую область.';
    });
  }

  function stop(silent) {
    if (running) {
      running.world.dispose();
      running = null;
      if (!silent) setStatus('Остановлено', '');
    }
  }

  function fail(err, world) {
    if (world) world.dispose();
    running = null;
    if (err instanceof Core.CoreError) {
      println(err.format(), 'err');
      if (err.blockId) editor.markError(err.blockId);
    } else {
      println('Внутренняя ошибка: ' + err.message, 'err');
    }
    setStatus('Ошибка', 'err');
  }

  function run() {
    stop(true);
    outEl.textContent = '';
    editor.clearError();
    var program = editor.getProgram();
    if (!program.body.length) {
      println('Рабочая область пуста — перетащите блоки из палитры.', 'muted');
      return;
    }
    A.number(program);
    editor.render();                                   // чтобы на блоках появились номера
    program = JSON.parse(JSON.stringify(program));     // правки во время работы не ломают запущенную копию
    var touched = new Set();
    var world = Core.World ? Core.World.create({ canvas: canvas }) : null;
    var interp = new Core.Interpreter(program, {
      output: println,
      builtins: world ? world.builtins : {},
      onBlock: function (id) { touched.add(id); }
    });
    setStatus('Выполняется…', 'run');
    try {
      interp.run();
    } catch (err) {
      return fail(err, world);
    }
    editor.flash(touched);
    interp.onBlock = null;
    if (world && interp.handlers.has('кадр')) {
      running = { world: world, interp: interp };
      world.startLoop(interp, { onError: function (err) { fail(err, world); } });
    } else {
      if (world) world.dispose();
      setStatus('Готово', 'ok');
    }
  }

  function reset() {
    stop(true);
    outEl.textContent = '';
    editor.clearError();
    if (Core.World) Core.World.clearCanvas(canvas);
    setStatus('Готов к запуску', '');
  }

  function loadDemo(id) {
    var d = Core.Demos.filter(function (x) { return x.id === id; })[0];
    reset();
    if (!d) { editor.setItems([]); return; }
    editor.setItems(d.build());
  }

  // ----- кнопки и панели -----
  $('run').addEventListener('click', run);
  $('stop').addEventListener('click', function () { stop(); });
  $('reset').addEventListener('click', reset);
  $('arrange').addEventListener('click', function () { editor.arrange(); });

  var demoSel = $('demo');
  var empty = document.createElement('option');
  empty.value = ''; empty.textContent = 'Пустая рабочая область';
  demoSel.appendChild(empty);
  Core.Demos.forEach(function (d) {
    var o = document.createElement('option');
    o.value = d.id; o.textContent = d.title;
    demoSel.appendChild(o);
  });
  demoSel.addEventListener('change', function () { loadDemo(demoSel.value); });

  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (x) { x.classList.toggle('active', x === b); });
      outEl.hidden = b.dataset.tab !== 'out';
      codeEl.hidden = b.dataset.tab !== 'code';
    });
  });

  if (Core.World) Core.World.clearCanvas(canvas);
  demoSel.value = Core.Demos.length ? Core.Demos[0].id : '';
  loadDemo(demoSel.value);
  setStatus('Готов к запуску', '');
})(globalThis);
