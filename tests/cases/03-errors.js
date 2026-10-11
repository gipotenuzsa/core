const { v, bin, not, call, let: L, assign, change, if_, repeat, while_, show, func, ret, cs, program } = Core.AST;

module.exports = [
  {
    name: 'деление на ноль — ошибка с номером блока',
    // блоки: 1 = показать, 2 = «/», 3 = число 1, 4 = число 0
    program: program([show(bin('/', 1, 0))]),
    error: 'Деление на ноль',
    block: 2
  },
  {
    name: 'остаток от деления на ноль',
    program: program([show(bin('%', 5, 0))]),
    error: 'Остаток от деления на ноль'
  },
  {
    name: 'сообщение об ошибке по-русски с номером блока',
    run({ Core, execute }) {
      const r = execute({ program: program([show(bin('/', 1, 0))]) });
      if (r.error.format() !== 'Ошибка в блоке №2: Деление на ноль.') throw new Error(r.error.format());
    }
  },
  {
    name: 'лимит шагов: бесконечный цикл «пока»',
    program: program([while_(true, [])]),
    maxSteps: 1000,
    error: 'Превышен лимит шагов'
  },
  {
    name: 'лимит шагов: огромное «повторить»',
    program: program([repeat(1e9, [show('x')])]),
    maxSteps: 500,
    error: 'лимит шагов'
  },
  {
    name: 'лимит шагов: вывод не успел бы зависнуть браузер (остановка до конца)',
    run({ Core, execute }) {
      const r = execute({ program: program([L('i', 0), while_(true, [change('i', 1)])]), maxSteps: 10000 });
      if (!r.error || r.interp.steps > 10001) throw new Error('цикл не остановлен вовремя');
    }
  },
  {
    name: 'бесконечная рекурсия',
    program: program([func('f', [], [cs('f')]), cs('f')]),
    error: 'рекурсия'
  },
  {
    name: 'неизвестная переменная',
    program: program([show(v('нет'))]),
    error: 'Переменная «нет» не создана',
    block: 2
  },
  {
    name: '«изменить» несуществующей переменной',
    program: program([change('z', 1)]),
    error: 'не создана'
  },
  {
    name: 'неизвестная функция',
    program: program([cs('нету')]),
    error: 'Неизвестная функция «нету»'
  },
  {
    name: 'неверное число аргументов',
    program: program([func('f', ['a'], []), cs('f', 1, 2)]),
    error: 'ожидает аргументов: 1'
  },
  {
    name: 'число минус текст',
    program: program([show(bin('-', 5, 'а'))]),
    error: 'не работает с такими значениями'
  },
  {
    name: 'условие не логического типа',
    program: program([if_(5, [show('x')])]),
    error: 'логическим значением'
  },
  {
    name: 'сравнение числа с текстом',
    program: program([show(bin('<', 1, 'а'))]),
    error: 'Сравнивать'
  },
  {
    name: '«не» от числа',
    program: program([show(not(1))]),
    error: 'логическим значением'
  },
  {
    name: 'пустое место в блоке',
    program: program([show(null)]),
    error: 'Не заполнено значение',
    block: 1
  },
  {
    name: '«повторить» с текстом вместо числа',
    program: program([repeat('три', [])]),
    error: 'должно быть числом'
  },
  {
    name: '«вернуть» вне функции',
    program: program([ret(1)]),
    error: 'только внутри функции'
  }
];
