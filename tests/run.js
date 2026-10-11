/* Запуск: node tests/run.js
   Каждый файл в tests/cases/ экспортирует массив случаев:
     { name, program, output: [...строки] }          — ожидаем такой вывод
     { name, program, error: 'часть сообщения', block: N? } — ожидаем ошибку
     { name, program, code: 'текст программы' }      — проверяем генерацию текста
     { name, run(ctx) }                              — произвольная проверка (бросает ошибку при провале)
   Необязательно: maxSteps, world: true (подключить библиотеку «Мир» с поддельным холстом). */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sources = [
  'src/core/ast.js', 'src/core/interpreter.js', 'src/core/codegen.js',
  'src/world/world.js', 'src/demos/sum.js', 'src/demos/shooter.js'
];
for (const f of sources) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) require(p);
}
const Core = globalThis.Core;

function execute(c) {
  const out = [];
  const opts = { output: (t) => out.push(t) };
  if (c.maxSteps) opts.maxSteps = c.maxSteps;
  let world = null;
  if (c.world) {
    world = Core.World.createFake();
    opts.builtins = world.builtins;
  }
  const program = c.program;
  Core.AST.number(program);
  const interp = new Core.Interpreter(program, opts);
  let error = null;
  try { interp.run(); } catch (e) {
    if (!(e instanceof Core.CoreError)) throw e;
    error = e;
  }
  return { out, error, interp, world };
}

function check(c) {
  if (c.run) return c.run({ Core, execute });
  if (c.code !== undefined) {
    const got = Core.codegen(c.program);
    if (got !== c.code) throw new Error('текст программы не совпал.\n--- ожидалось:\n' + c.code + '\n--- получено:\n' + got);
    return;
  }
  const r = execute(c);
  if (c.error !== undefined) {
    if (!r.error) throw new Error('ожидалась ошибка «' + c.error + '», но программа завершилась без ошибок');
    if (r.error.message.indexOf(c.error) < 0) throw new Error('ошибка не та: «' + r.error.message + '», ожидалась часть «' + c.error + '»');
    if (c.block !== undefined && r.error.blockId !== c.block) throw new Error('ошибка в блоке №' + r.error.blockId + ', ожидался №' + c.block);
    return;
  }
  if (r.error) throw new Error('неожиданная ошибка: ' + r.error.format());
  const want = JSON.stringify(c.output);
  const got = JSON.stringify(r.out);
  if (want !== got) throw new Error('вывод не совпал. Ожидалось ' + want + ', получено ' + got);
}

let passed = 0, failed = 0;
const dir = path.join(__dirname, 'cases');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  const cases = require(path.join(dir, file));
  console.log('\n' + file);
  for (const c of cases) {
    try {
      check(c);
      passed++;
      console.log('  ✓ ' + c.name);
    } catch (e) {
      failed++;
      console.log('  ✗ ' + c.name + '\n      ' + String(e.message).split('\n').join('\n      '));
    }
  }
}
console.log('\nПройдено: ' + passed + ', провалено: ' + failed);
process.exit(failed ? 1 : 0);
