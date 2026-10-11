const { v, bin, call, let: L, assign, change, if_, show, cs, on, program } = Core.AST;

function lastCall(world, kind) {
  return world.calls.filter((c) => c[0] === kind).pop();
}

module.exports = [
  {
    name: 'ядро не знает о «Мире»: без библиотеки функция неизвестна',
    program: program([cs('прямоугольник', 1, 2, 3, 4, 'синий')]),
    error: 'Неизвестная функция «прямоугольник»'
  },
  {
    name: 'прямоугольник рисуется с нужными координатами и цветом',
    run({ Core, execute }) {
      const r = execute({ world: true, program: program([cs('прямоугольник', 10, 20, 30, 40, 'красный')]) });
      if (r.error) throw r.error;
      const c = lastCall(r.world, 'rect');
      if (JSON.stringify(c.slice(1, 5)) !== '[10,20,30,40]') throw new Error('координаты: ' + JSON.stringify(c));
      if (c[5] !== Core.World.COLORS['красный']) throw new Error('цвет: ' + c[5]);
    }
  },
  {
    name: 'очистить закрашивает весь холст',
    run({ Core, execute }) {
      const r = execute({ world: true, program: program([cs('очистить', 'фон')]) });
      const c = lastCall(r.world, 'rect');
      if (JSON.stringify(c.slice(1, 5)) !== '[0,0,480,360]') throw new Error(JSON.stringify(c));
    }
  },
  {
    name: 'холст меняет размер',
    run({ Core, execute }) {
      const r = execute({ world: true, program: program([cs('холст', 320, 200)]) });
      if (r.world.canvas.width !== 320 || r.world.canvas.height !== 200) throw new Error('размер не изменился');
    }
  },
  {
    name: 'надпись и надпись по центру выводят текст',
    run({ Core, execute }) {
      const r = execute({ world: true, program: program([cs('надпись', 'Счёт ', 5, 6, 16, 'белый'), cs('надпись_по_центру', 7, 100, 20, 24, 'белый')]) });
      if (r.error) throw r.error;
      const t = r.world.calls.filter((c) => c[0] === 'text');
      if (t[0][1] !== 'Счёт ' || t[1][1] !== '7') throw new Error(JSON.stringify(t));
    }
  },
  {
    name: 'клавиша нажата: стрелки, WASD и пробел',
    run({ Core, execute }) {
      const prog = () => program([
        show(call('клавиша', 'влево')), show(call('клавиша', 'вправо')), show(call('клавиша', 'пробел'))
      ]);
      const out = [];
      const world = Core.World.createFake();
      world.press('KeyA'); world.press('Space');
      const it = new Core.Interpreter(prog(), { output: (t) => out.push(t), builtins: world.builtins });
      it.run();
      if (JSON.stringify(out) !== '["истина","ложь","истина"]') throw new Error(JSON.stringify(out));
      world.release('KeyA'); world.press('ArrowRight');
      out.length = 0; it.run();
      if (JSON.stringify(out) !== '["ложь","истина","истина"]') throw new Error(JSON.stringify(out));
    }
  },
  {
    name: 'неизвестная клавиша — понятная ошибка',
    world: true,
    program: program([show(call('клавиша', 'ввод'))]),
    error: 'Неизвестная клавиша'
  },
  {
    name: 'таймер считает секунды',
    run({ Core, execute }) {
      const world = Core.World.createFake();
      const out = [];
      const it = new Core.Interpreter(program([show(call('таймер'))]), { output: (t) => out.push(t), builtins: world.builtins });
      world.advance(2500);
      it.run();
      if (out[0] !== '2.5') throw new Error(out[0]);
    }
  },
  {
    name: 'случайное число всегда в диапазоне и бывает разным',
    run({ Core, execute }) {
      const world = Core.World.createFake();
      const seen = new Set();
      const it = new Core.Interpreter(program([L('r', call('случайное', 3, 6)), show(v('r'))]), {
        output: (t) => seen.add(+t), builtins: world.builtins
      });
      for (let i = 0; i < 200; i++) it.run();
      const list = [...seen].sort();
      if (list.some((n) => n < 3 || n > 6 || !Number.isInteger(n))) throw new Error('вне диапазона: ' + list);
      if (list.length < 3) throw new Error('случайные числа почти не меняются: ' + list);
    }
  },
  {
    name: 'случайное число: пустой диапазон — ошибка',
    world: true,
    program: program([show(call('случайное', 5, 1))]),
    error: 'нет целых чисел'
  },
  {
    name: 'целая часть числа',
    world: true,
    program: program([show(call('целое', 3.9)), show(call('целое', 0.2))]),
    output: ['3', '0']
  },
  {
    name: 'цвет должен быть текстом',
    world: true,
    program: program([cs('очистить', 5)]),
    error: 'Цвет должен быть текстом'
  },
  {
    name: 'блок «каждый кадр»: выполняется на каждом кадре цикла',
    run({ Core, execute }) {
      const world = Core.World.createFake();
      const out = [];
      const it = new Core.Interpreter(program([L('n', 0), on('кадр', [change('n', 1)])]), {
        output: (t) => out.push(t), builtins: world.builtins
      });
      it.run();
      world.frames(it, 60);
      if (it.globals.vars.get('n') !== 60) throw new Error('n = ' + it.globals.vars.get('n'));
    }
  },
  {
    name: 'ошибка внутри кадра имеет номер блока, а бесконечный цикл в кадре останавливается',
    run({ Core, execute }) {
      const world = Core.World.createFake();
      const { while_ } = Core.AST;
      const prog = program([on('кадр', [while_(true, [])])]);
      Core.AST.number(prog);
      const it = new Core.Interpreter(prog, { builtins: world.builtins });
      it.run();
      let err = null;
      try { world.frames(it, 1); } catch (e) { err = e; }
      if (!err || !/лимит шагов/.test(err.message) || !err.blockId) throw new Error('ожидалась ошибка лимита шагов с номером блока');
    }
  }
];
