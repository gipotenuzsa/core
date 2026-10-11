const { v, bin, not, call, let: L, assign, change, if_, repeat, while_, show, func, ret, cs, on, program } = Core.AST;

module.exports = [
  {
    name: 'текст: переменные, изменить, показать',
    program: program([L('сумма', 0), change('сумма', 1), assign('сумма', 5), show(v('сумма'))]),
    code: 'переменная сумма = 0\nизменить сумма на 1\nприсвоить сумма = 5\nпоказать сумма'
  },
  {
    name: 'текст: если / иначе / конец',
    program: program([if_(bin('>', v('x'), 1), [show('да')], [show('нет')])]),
    code: 'если x > 1 то\n  показать "да"\nиначе\n  показать "нет"\nконец'
  },
  {
    name: 'текст: циклы',
    program: program([repeat(3, [show(1)]), while_(true, [show(2)])]),
    code: 'повторить 3 раз\n  показать 1\nконец\nпока истина\n  показать 2\nконец'
  },
  {
    name: 'текст: функция и вызовы',
    program: program([func('сложить', ['a', 'b'], [ret(bin('+', v('a'), v('b')))]), cs('сложить', 1, 2), show(call('сложить', 1, 2))]),
    code: 'функция сложить(a, b)\n  вернуть a + b\nконец\nсложить(1, 2)\nпоказать сложить(1, 2)'
  },
  {
    name: 'текст: скобки по приоритету',
    program: program([show(bin('*', bin('+', 1, 2), 3)), show(bin('+', 1, bin('*', 2, 3))), show(bin('-', 1, bin('-', 2, 3)))]),
    code: 'показать (1 + 2) × 3\nпоказать 1 + 2 × 3\nпоказать 1 − (2 − 3)'
  },
  {
    name: 'текст: логика и обработчик события',
    program: program([on('кадр', [if_(bin('and', not(v('a')), bin('or', v('b'), v('c'))), [show(1)])])]),
    code: 'при событии "кадр"\n  если не a и (b или c) то\n    показать 1\n  конец\nконец'
  },
  {
    name: 'текст: пустое место показывается как «…»',
    program: program([show(null), L('x', null)]),
    code: 'показать …\nпеременная x = …'
  }
];
