// Проверка реестра блоков редактора: у каждого блока из палитры есть описание, текст и работающая функция.
const B = Core.Blocks;

module.exports = [
  {
    name: 'каждый блок палитры имеет описание, а вложенные узлы — тоже',
    run({ Core }) {
      let count = 0;
      B.CATEGORIES.forEach((cat) => {
        B.paletteFor(cat.id).forEach((p) => {
          const node = p.make();
          Core.AST.walk(node, (n) => {
            if (!B.spec(n)) throw new Error('нет описания блока «' + n.type + '» (категория ' + cat.id + ')');
          });
          B.partsOf(node);
          count++;
        });
      });
      if (count < 30) throw new Error('в палитре подозрительно мало блоков: ' + count);
    }
  },
  {
    name: 'каждый блок палитры превращается в текст программы без ошибок',
    run({ Core }) {
      B.CATEGORIES.forEach((cat) => {
        B.paletteFor(cat.id).forEach((p) => {
          const node = p.make();
          const prog = B.kindOf(node) === 'stmt' ? Core.AST.program([node]) : Core.AST.program([Core.AST.show(node)]);
          const text = Core.codegen(prog);
          if (!text) throw new Error('пустой текст для блока ' + node.type);
        });
      });
    }
  },
  {
    name: 'каждая встроенная функция библиотеки «Мир» из блоков реально существует и совпадает по числу аргументов',
    run({ Core }) {
      const world = Core.World.createFake();
      Object.keys(B.builtins).forEach((name) => {
        const rt = world.builtins[name];
        if (!rt) throw new Error('блок «' + name + '» есть, а функции в библиотеке нет');
        if (rt.arity !== B.builtins[name].args.length) throw new Error('число аргументов у «' + name + '» не совпадает');
      });
      Object.keys(world.builtins).forEach((name) => {
        if (!B.builtins[name]) throw new Error('функция «' + name + '» есть, а блока для неё нет');
      });
    }
  },
  {
    name: 'ядро не зависит от библиотеки «Мир»: в блоках ядра нет игровых слов',
    run({ Core }) {
      const fs = require('fs'), path = require('path');
      ['src/core/ast.js', 'src/core/interpreter.js', 'src/core/codegen.js', 'src/editor/blocks-core.js'].forEach((f) => {
        const text = fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
        ['игрок', 'холст', 'пуля', 'клавиш', 'кадр', 'World'].forEach((w) => {
          if (text.toLowerCase().indexOf(w.toLowerCase()) >= 0) throw new Error('в ' + f + ' найдено «' + w + '»');
        });
      });
    }
  }
];
