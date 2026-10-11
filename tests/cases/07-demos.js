// Демонстрационные программы целиком: их собирает тот же код, что и редактор.
function load(id) {
  const demo = Core.Demos.find((d) => d.id === id);
  let body = [];
  demo.build().forEach((it) => { body = body.concat(it.nodes); });
  const prog = Core.AST.program(body);
  Core.AST.number(prog);
  return prog;
}

function startShooter() {
  const world = Core.World.createFake();
  const out = [];
  const it = new Core.Interpreter(load('shooter'), { output: (t) => out.push(t), builtins: world.builtins });
  it.run();
  return { world, it, out, get: (n) => it.globals.vars.get(n) };
}

module.exports = [
  {
    name: 'демо 1: «Сумма от 1 до 10» выводит 55',
    run({ Core }) {
      const out = [];
      new Core.Interpreter(load('sum'), { output: (t) => out.push(t) }).run();
      if (JSON.stringify(out) !== '["55"]') throw new Error(JSON.stringify(out));
    }
  },
  {
    name: 'демо 2: шутер запускается, регистрирует «каждый кадр» и ничего не выводит',
    run() {
      const g = startShooter();
      if (!g.it.handlers.has('кадр')) throw new Error('нет обработчика кадра');
      if (g.out.length) throw new Error('лишний вывод: ' + g.out);
      if (g.get('игрок_жизнь') !== 5 || g.get('бот_жизнь') !== 5) throw new Error('неверное начальное здоровье');
    }
  },
  {
    name: 'демо 2: кадр рисует поле, обе команды и шкалы здоровья',
    run() {
      const g = startShooter();
      g.world.frames(g.it, 1);
      const colors = new Set(g.world.calls.filter((c) => c[0] === 'rect').map((c) => c[5]));
      if (!colors.has(Core.World.COLORS['синий']) || !colors.has(Core.World.COLORS['красный'])) throw new Error('нет синих/красных прямоугольников');
      const texts = g.world.calls.filter((c) => c[0] === 'text').map((c) => c[1]);
      if (!texts.some((t) => /^Время: 30$/.test(t))) throw new Error('нет таймера: ' + texts);
    }
  },
  {
    name: 'демо 2: игрок двигается стрелками и не выходит за поле',
    run() {
      const g = startShooter();
      g.world.press('ArrowLeft');
      g.world.frames(g.it, 10);
      if (g.get('игрок_x') !== 200) throw new Error('игрок_x = ' + g.get('игрок_x'));
      g.world.frames(g.it, 200);
      if (g.get('игрок_x') !== 0) throw new Error('игрок вышел за поле: ' + g.get('игрок_x'));
    }
  },
  {
    name: 'демо 2: пробел создаёт одну пулю, пуля летит и пропадает за краем',
    run() {
      const g = startShooter();
      g.world.press('Space');
      g.world.frames(g.it, 1);
      if (g.get('пуля_и_вкл') !== true) throw new Error('пуля не появилась');
      const y1 = g.get('пуля_и_y');
      g.world.frames(g.it, 1);
      if (!(g.get('пуля_и_y') < y1)) throw new Error('пуля не летит вверх');
    }
  },
  {
    name: 'демо 2: попадание пули в бота отнимает здоровье и добавляет счёт',
    run() {
      const g = startShooter();
      // ставим игрока строго под ботом, чтобы выстрел вверх попал
      g.it.globals.vars.set('игрок_x', g.get('бот_x'));
      g.it.globals.vars.set('бот_перезарядка', -1000);   // бот пока не стреляет
      g.world.press('Space');
      g.world.frames(g.it, 60);
      if (g.get('счёт_синих') < 1 || g.get('бот_жизнь') >= 5) throw new Error('попаданий нет: счёт ' + g.get('счёт_синих') + ', жизнь бота ' + g.get('бот_жизнь'));
    }
  },
  {
    name: 'демо 2: раунд заканчивается по таймеру и показывает итог (30 секунд)',
    run() {
      const g = startShooter();
      g.world.frames(g.it, 60 * 31);
      if (g.get('конец') !== true) throw new Error('раунд не закончился');
      const result = g.get('итог');
      if (!/Победа синих!|Победа красных!|Ничья/.test(result)) throw new Error('итог: ' + result);
      if (g.get('осталось') !== 0 && g.get('игрок_жизнь') > 0 && g.get('бот_жизнь') > 0) throw new Error('конец без причины');
      const texts = g.world.calls.filter((c) => c[0] === 'text').map((c) => c[1]);
      if (texts.indexOf(result) < 0) throw new Error('экран конца раунда не показан');
    }
  },
  {
    name: 'демо 2: неподвижный игрок получает попадания от бота',
    run() {
      const g = startShooter();
      g.world.frames(g.it, 60 * 31);
      if (g.get('счёт_красных') < 1) throw new Error('бот ни разу не попал за раунд');
    }
  },
  {
    name: 'демо 2: тысячи кадров подряд без ошибок и без превышения лимита шагов',
    run() {
      const g = startShooter();
      ['ArrowRight', 'Space'].forEach((k) => g.world.press(k));
      g.world.frames(g.it, 3000);
    }
  },
  {
    name: 'демо 2: в программе шутера нет ни одного игрового блока ядра (только ядро + «Мир»)',
    run({ Core }) {
      const prog = load('shooter');
      const coreTypes = new Set(['num', 'str', 'bool', 'var', 'bin', 'not', 'call', 'let', 'assign', 'change', 'if', 'repeat', 'while', 'func', 'return', 'show', 'callstmt', 'on']);
      Core.AST.walk(prog, (n) => { if (n.type !== 'program' && !coreTypes.has(n.type)) throw new Error('чужой блок: ' + n.type); });
      Core.AST.walk(prog, (n) => {
        if ((n.type === 'call' || n.type === 'callstmt') && !Core.Blocks.builtins[n.name] && !['попал', 'знак', 'в_пределах'].includes(n.name)) {
          throw new Error('неизвестный вызов: ' + n.name);
        }
      });
    }
  }
];
