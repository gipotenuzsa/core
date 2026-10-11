/* Демо 2: «Мини-шутер Core». Игра целиком собрана из блоков ядра и библиотеки «Мир»:
   никаких игровых блоков в ядре нет. Синие (игрок, стрелки + пробел) против красных (бот). */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};
  Core.Demos = Core.Demos || [];
  var A = Core.AST;

  var v = A.v, num = A.num, str = A.str, call = A.call, cs = A.cs;
  function bin(op, a, b) { return A.bin(op, a, b); }
  function add(a, b) { return bin('+', a, b); }
  function sub(a, b) { return bin('-', a, b); }
  function mul(a, b) { return bin('*', a, b); }
  function lt(a, b) { return bin('<', a, b); }
  function gt(a, b) { return bin('>', a, b); }
  function le(a, b) { return bin('<=', a, b); }
  function ge(a, b) { return bin('>=', a, b); }
  function and(a, b) { return bin('and', a, b); }
  function or(a, b) { return bin('or', a, b); }
  function not(a) { return A.not(a); }
  function key(name) { return call('клавиша', name); }
  function rect(x, y, w, h, c) { return cs('прямоугольник', x, y, w, h, c); }
  function label(text, x, y, size, c) { return cs('надпись', text, x, y, size, c); }
  function center(text, x, y, size, c) { return cs('надпись_по_центру', text, x, y, size, c); }

  // выход за границы поля
  function outside(x, y) {
    return or(or(lt(v(x), 0), gt(v(x), 480)), or(lt(v(y), 0), gt(v(y), 360)));
  }

  function build() {
    // ---- функции ----
    // попадание точки (x, y) в прямоугольник (rx, ry, rw, rh)
    var fHit = A.func('попал', ['x', 'y', 'rx', 'ry', 'rw', 'rh'], [
      A.ret(and(and(ge(v('x'), v('rx')), le(v('x'), add(v('rx'), v('rw')))),
        and(ge(v('y'), v('ry')), le(v('y'), add(v('ry'), v('rh'))))))
    ]);
    var fSign = A.func('знак', ['x'], [
      A.if_(gt(v('x'), 0), [A.ret(1)]),
      A.if_(lt(v('x'), 0), [A.ret(-1)]),
      A.ret(0)
    ]);
    var fClamp = A.func('в_пределах', ['значение', 'мин', 'макс'], [
      A.if_(lt(v('значение'), v('мин')), [A.ret(v('мин'))]),
      A.if_(gt(v('значение'), v('макс')), [A.ret(v('макс'))]),
      A.ret(v('значение'))
    ]);

    // ---- начальное состояние ----
    var init = [
      cs('холст', 480, 360),
      A.let('игрок_x', 230), A.let('игрок_y', 300), A.let('игрок_жизнь', 5),
      A.let('игрок_dx', 0), A.let('игрок_dy', -1),
      A.let('пуля_и_вкл', false), A.let('пуля_и_x', 0), A.let('пуля_и_y', 0), A.let('пуля_и_dx', 0), A.let('пуля_и_dy', 0),
      A.let('бот_x', 230), A.let('бот_y', 50), A.let('бот_жизнь', 5), A.let('бот_перезарядка', 0),
      A.let('пуля_б_вкл', false), A.let('пуля_б_x', 0), A.let('пуля_б_y', 0), A.let('пуля_б_dx', 0), A.let('пуля_б_dy', 0),
      A.let('счёт_синих', 0), A.let('счёт_красных', 0),
      A.let('длительность', 30), A.let('осталось', 30),
      A.let('конец', false), A.let('итог', '')
    ];

    // ---- движение и выстрел игрока ----
    var playerTurn = [
      A.if_(key('влево'), [A.change('игрок_x', -3), A.assign('игрок_dx', -1), A.assign('игрок_dy', 0)]),
      A.if_(key('вправо'), [A.change('игрок_x', 3), A.assign('игрок_dx', 1), A.assign('игрок_dy', 0)]),
      A.if_(key('вверх'), [A.change('игрок_y', -3), A.assign('игрок_dx', 0), A.assign('игрок_dy', -1)]),
      A.if_(key('вниз'), [A.change('игрок_y', 3), A.assign('игрок_dx', 0), A.assign('игрок_dy', 1)]),
      A.assign('игрок_x', call('в_пределах', v('игрок_x'), 0, 460)),
      A.assign('игрок_y', call('в_пределах', v('игрок_y'), 45, 340)),
      // выстрел: одна пуля за раз, летит туда, куда смотрит игрок
      A.if_(and(key('пробел'), not(v('пуля_и_вкл'))), [
        A.assign('пуля_и_вкл', true),
        A.assign('пуля_и_x', add(v('игрок_x'), 10)),
        A.assign('пуля_и_y', add(v('игрок_y'), 10)),
        A.assign('пуля_и_dx', v('игрок_dx')),
        A.assign('пуля_и_dy', v('игрок_dy'))
      ]),
      A.if_(v('пуля_и_вкл'), [
        A.change('пуля_и_x', mul(v('пуля_и_dx'), 7)),
        A.change('пуля_и_y', mul(v('пуля_и_dy'), 7)),
        A.if_(call('попал', v('пуля_и_x'), v('пуля_и_y'), v('бот_x'), v('бот_y'), 20, 20), [
          A.change('бот_жизнь', -1),
          A.change('счёт_синих', 1),
          A.assign('пуля_и_вкл', false)
        ], [
          A.if_(outside('пуля_и_x', 'пуля_и_y'), [A.assign('пуля_и_вкл', false)])
        ])
      ])
    ];

    // ---- бот: идёт к игроку, затем выравнивается по нему и стреляет ----
    var botTurn = [
      A.let('dx', sub(v('игрок_x'), v('бот_x'))),
      A.let('dy', sub(v('игрок_y'), v('бот_y'))),
      A.if_(gt(add(mul(v('dx'), v('dx')), mul(v('dy'), v('dy'))), 14400), [
        A.change('бот_x', mul(call('знак', v('dx')), 1.4)),
        A.change('бот_y', mul(call('знак', v('dy')), 1.4))
      ], [
        A.if_(lt(mul(v('dx'), v('dx')), mul(v('dy'), v('dy'))), [
          A.change('бот_x', mul(call('знак', v('dx')), 2))
        ], [
          A.change('бот_y', mul(call('знак', v('dy')), 2))
        ])
      ]),
      A.assign('бот_x', call('в_пределах', v('бот_x'), 0, 460)),
      A.assign('бот_y', call('в_пределах', v('бот_y'), 45, 340)),
      A.change('бот_перезарядка', 1),
      A.if_(and(ge(v('бот_перезарядка'), 60), not(v('пуля_б_вкл'))), [
        A.assign('бот_перезарядка', 0),
        A.assign('пуля_б_вкл', true),
        A.assign('пуля_б_x', add(v('бот_x'), 10)),
        A.assign('пуля_б_y', add(v('бот_y'), 10)),
        A.if_(gt(mul(v('dx'), v('dx')), mul(v('dy'), v('dy'))), [
          A.assign('пуля_б_dx', call('знак', v('dx'))), A.assign('пуля_б_dy', 0)
        ], [
          A.assign('пуля_б_dx', 0), A.assign('пуля_б_dy', call('знак', v('dy')))
        ])
      ]),
      A.if_(v('пуля_б_вкл'), [
        A.change('пуля_б_x', mul(v('пуля_б_dx'), 5)),
        A.change('пуля_б_y', mul(v('пуля_б_dy'), 5)),
        A.if_(call('попал', v('пуля_б_x'), v('пуля_б_y'), v('игрок_x'), v('игрок_y'), 20, 20), [
          A.change('игрок_жизнь', -1),
          A.change('счёт_красных', 1),
          A.assign('пуля_б_вкл', false)
        ], [
          A.if_(outside('пуля_б_x', 'пуля_б_y'), [A.assign('пуля_б_вкл', false)])
        ])
      ])
    ];

    // ---- таймер раунда и конец ----
    var roundClock = [
      A.assign('осталось', call('в_пределах', sub(v('длительность'), call('целое', call('таймер'))), 0, v('длительность'))),
      A.if_(or(le(v('осталось'), 0), or(le(v('бот_жизнь'), 0), le(v('игрок_жизнь'), 0))), [
        A.assign('конец', true),
        A.if_(gt(v('игрок_жизнь'), v('бот_жизнь')), [A.assign('итог', 'Победа синих!')], [
          A.if_(lt(v('игрок_жизнь'), v('бот_жизнь')), [A.assign('итог', 'Победа красных!')], [A.assign('итог', 'Ничья')])
        ])
      ])
    ];

    // ---- рисование ----
    var draw = [
      cs('очистить', 'фон'),
      rect(0, 40, 480, 2, 'серый'),
      rect(v('бот_x'), v('бот_y'), 20, 20, 'красный'),
      rect(v('игрок_x'), v('игрок_y'), 20, 20, 'синий'),
      A.if_(v('пуля_и_вкл'), [rect(sub(v('пуля_и_x'), 2), sub(v('пуля_и_y'), 2), 4, 4, '#a9c4ff')]),
      A.if_(v('пуля_б_вкл'), [rect(sub(v('пуля_б_x'), 2), sub(v('пуля_б_y'), 2), 4, 4, '#ffb0b0')]),
      // шкалы здоровья
      label('Синие', 10, 6, 13, 'синий'),
      rect(10, 26, 100, 6, 'серый'),
      rect(10, 26, mul(v('игрок_жизнь'), 20), 6, 'синий'),
      label('Красные', 420, 6, 13, 'красный'),
      rect(370, 26, 100, 6, 'серый'),
      rect(sub(470, mul(v('бот_жизнь'), 20)), 26, mul(v('бот_жизнь'), 20), 6, 'красный'),
      center(add('Время: ', v('осталось')), 240, 6, 16, 'белый'),
      center(add(add(add('Счёт ', v('счёт_синих')), ' : '), v('счёт_красных')), 240, 24, 13, 'белый'),
      // экран конца раунда
      A.if_(v('конец'), [
        rect(60, 100, 360, 160, 'серый'),
        rect(62, 102, 356, 156, 'чёрный'),
        center(v('итог'), 240, 125, 30, 'белый'),
        center(add(add(add('Счёт ', v('счёт_синих')), ' : '), v('счёт_красных')), 240, 175, 18, 'белый'),
        center('«Сбросить», затем «Запуск» — сыграть ещё', 240, 215, 13, 'серый')
      ])
    ];

    var frame = A.on('кадр', [A.if_(not(v('конец')), playerTurn.concat(botTurn, roundClock))].concat(draw));

    return [
      { nodes: [fHit] },
      { nodes: [fSign] },
      { nodes: [fClamp] },
      { nodes: init },
      { nodes: [frame] }
    ];
  }

  Core.Demos.push({ id: 'shooter', title: 'Мини-шутер Core', build: build });
})(globalThis);
