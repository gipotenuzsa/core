/* Демо 1: сумма чисел от 1 до 10. Должна показать 55. */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};
  Core.Demos = Core.Demos || [];
  var A = Core.AST;

  Core.Demos.push({
    id: 'sum',
    title: 'Сумма от 1 до 10',
    build: function () {
      return [{
        nodes: [
          A.let('сумма', 0),
          A.let('число', 0),
          A.repeat(10, [
            A.change('число', 1),
            A.change('сумма', A.v('число'))
          ]),
          A.show(A.v('сумма'))
        ]
      }];
    }
  });
})(globalThis);
