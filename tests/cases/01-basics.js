const { v, bin, not, let: L, assign, change, if_, repeat, while_, show, program } = Core.AST;

module.exports = [
  {
    name: 'сумма от 1 до 10 = 55',
    program: program([
      L('сумма', 0),
      L('i', 1),
      while_(bin('<=', v('i'), 10), [change('сумма', v('i')), change('i', 1)]),
      show(v('сумма'))
    ]),
    output: ['55']
  },
  {
    name: 'сумма через «повторить»',
    program: program([
      L('сумма', 0), L('i', 0),
      repeat(10, [change('i', 1), change('сумма', v('i'))]),
      show(v('сумма'))
    ]),
    output: ['55']
  },
  {
    name: 'числа, текст, логические значения выводятся',
    program: program([show(42), show(2.5), show('привет'), show(true), show(false)]),
    output: ['42', '2.5', 'привет', 'истина', 'ложь']
  },
  {
    name: 'арифметика: + − × / остаток',
    program: program([
      show(bin('+', 2, 3)), show(bin('-', 2, 3)), show(bin('*', 4, 5)),
      show(bin('/', 7, 2)), show(bin('%', 7, 3))
    ]),
    output: ['5', '-1', '20', '3.5', '1']
  },
  {
    name: 'плавающая точка выводится аккуратно (0.1 + 0.2)',
    program: program([show(bin('+', 0.1, 0.2))]),
    output: ['0.3']
  },
  {
    name: 'склейка текста плюсом',
    program: program([show(bin('+', 'сумма: ', 55)), show(bin('+', 'это ', true))]),
    output: ['сумма: 55', 'это истина']
  },
  {
    name: 'сравнения чисел и текста',
    program: program([
      show(bin('=', 1, 1)), show(bin('!=', 1, 1)), show(bin('<', 1, 2)), show(bin('>', 1, 2)),
      show(bin('<=', 2, 2)), show(bin('>=', 1, 2)), show(bin('<', 'а', 'б')), show(bin('=', 1, '1'))
    ]),
    output: ['истина', 'ложь', 'истина', 'ложь', 'истина', 'ложь', 'истина', 'ложь']
  },
  {
    name: 'логика: и, или, не',
    program: program([
      show(bin('and', true, false)), show(bin('or', true, false)), show(not(false)), show(not(bin('and', true, true)))
    ]),
    output: ['ложь', 'истина', 'истина', 'ложь']
  },
  {
    name: '«и» не вычисляет правую часть, если левая ложь',
    program: program([show(bin('and', false, bin('/', 1, 0)))]),
    output: ['ложь']
  },
  {
    name: 'переменная и «присвоить»',
    program: program([L('x', 1), assign('x', 10), show(v('x'))]),
    output: ['10']
  },
  {
    name: '«изменить» прибавляет к числу и склеивает текст',
    program: program([L('x', 5), change('x', 2), show(v('x')), L('t', 'а'), change('t', 'б'), show(v('t'))]),
    output: ['7', 'аб']
  },
  {
    name: 'условие: ветка «то»',
    program: program([if_(bin('>', 3, 2), [show('да')], [show('нет')])]),
    output: ['да']
  },
  {
    name: 'условие: ветка «иначе»',
    program: program([if_(bin('<', 3, 2), [show('да')], [show('нет')])]),
    output: ['нет']
  },
  {
    name: 'условие без «иначе»',
    program: program([if_(false, [show('да')]), show('конец')]),
    output: ['конец']
  },
  {
    name: 'цикл «повторить» 3 раза',
    program: program([repeat(3, [show('привет')])]),
    output: ['привет', 'привет', 'привет']
  },
  {
    name: '«повторить» 0 раз ничего не делает',
    program: program([repeat(0, [show('x')]), show('ok')]),
    output: ['ok']
  },
  {
    name: 'цикл «пока»: счёт до 3',
    program: program([L('i', 1), while_(bin('<=', v('i'), 3), [show(v('i')), change('i', 1)])]),
    output: ['1', '2', '3']
  }
];
