const { v, bin, call, let: L, assign, change, if_, show, func, ret, cs, on, program } = Core.AST;

module.exports = [
  {
    name: 'функция с параметрами и «вернуть»',
    program: program([
      func('сложить', ['a', 'b'], [ret(bin('+', v('a'), v('b')))]),
      show(call('сложить', 2, 3))
    ]),
    output: ['5']
  },
  {
    name: 'функцию можно вызвать до её объявления (объявления поднимаются)',
    program: program([
      show(call('двойное', 21)),
      func('двойное', ['x'], [ret(bin('*', v('x'), 2))])
    ]),
    output: ['42']
  },
  {
    name: 'рекурсия: факториал 5 = 120',
    program: program([
      func('факт', ['n'], [
        if_(bin('<=', v('n'), 1), [ret(1)]),
        ret(bin('*', v('n'), call('факт', bin('-', v('n'), 1))))
      ]),
      show(call('факт', 5))
    ]),
    output: ['120']
  },
  {
    name: '«вернуть» прерывает функцию',
    program: program([
      func('f', [], [ret(1), show('не должно выводиться')]),
      show(call('f'))
    ]),
    output: ['1']
  },
  {
    name: 'функция без «вернуть» даёт «пусто»',
    program: program([func('f', [], []), show(call('f'))]),
    output: ['пусто']
  },
  {
    name: 'вызов функции как оператора',
    program: program([func('привет', ['кто'], [show(bin('+', 'привет, ', v('кто')))]), cs('привет', 'мир')]),
    output: ['привет, мир']
  },
  {
    name: 'внутри функции видны глобальные переменные, локальные не утекают',
    program: program([
      L('g', 1),
      func('f', [], [L('локальная', 5), change('g', 10)]),
      cs('f'),
      show(v('g'))
    ]),
    output: ['11']
  },
  {
    name: 'локальная переменная недоступна снаружи',
    program: program([func('f', [], [L('локальная', 5)]), cs('f'), show(v('локальная'))]),
    error: 'не создана'
  },
  {
    name: 'обработчик события регистрируется и вызывается через runHandler',
    run({ Core, execute }) {
      const out = [];
      const prog = program([
        L('n', 0),
        on('кадр', [change('n', 1), show(v('n'))])
      ]);
      Core.AST.number(prog);
      const it = new Core.Interpreter(prog, { output: (t) => out.push(t) });
      it.run();
      if (out.length) throw new Error('обработчик не должен выполняться при обычном запуске');
      it.runHandler('кадр'); it.runHandler('кадр');
      if (JSON.stringify(out) !== '["1","2"]') throw new Error('получено ' + JSON.stringify(out));
      if (it.runHandler('другое') !== false) throw new Error('несуществующее событие должно вернуть false');
    }
  }
];
