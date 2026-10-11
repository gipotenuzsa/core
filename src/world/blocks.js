/* Блоки библиотеки «Мир» для редактора. Ядро и его блоки об этом файле не знают. */
(function (g) {
  'use strict';
  var Core = g.Core;
  var B = Core.Blocks, A = Core.AST;

  B.register('on', {
    kind: 'stmt', cat: 'world',
    parts: ['каждый кадр', { stack: 'body' }],
    templates: [{ cat: 'world', make: function () { return A.on(Core.World.EVENT, []); } }]
  });

  var KEY_NAMES = ['влево', 'вправо', 'вверх', 'вниз', 'пробел'];

  B.registerBuiltin('холст', { cat: 'world', kind: 'stmt', title: 'холст', args: ['ширина', 'высота'], defaults: [480, 360] });
  B.registerBuiltin('очистить', { cat: 'world', kind: 'stmt', title: 'очистить экран', args: ['цвет'], defaults: ['фон'] });
  B.registerBuiltin('прямоугольник', {
    cat: 'world', kind: 'stmt', title: 'прямоугольник',
    args: ['x', 'y', 'ширина', 'высота', 'цвет'], defaults: [10, 10, 20, 20, 'синий']
  });
  B.registerBuiltin('надпись', {
    cat: 'world', kind: 'stmt', title: 'надпись',
    args: ['', 'x', 'y', 'размер', 'цвет'], defaults: ['Привет', 10, 10, 16, 'белый']
  });
  B.registerBuiltin('надпись_по_центру', {
    cat: 'world', kind: 'stmt', title: 'надпись по центру',
    args: ['', 'x', 'y', 'размер', 'цвет'], defaults: ['Привет', 240, 10, 16, 'белый']
  });
  B.registerBuiltin('клавиша', {
    cat: 'world', kind: 'expr', title: 'клавиша нажата:', args: [''],
    options: { 0: KEY_NAMES }, defaults: ['пробел']
  });
  B.registerBuiltin('таймер', { cat: 'world', kind: 'expr', title: 'таймер (сек)', args: [] });
  B.registerBuiltin('случайное', { cat: 'world', kind: 'expr', title: 'случайное число', args: ['от', 'до'], defaults: [1, 10] });
  B.registerBuiltin('целое', { cat: 'world', kind: 'expr', title: 'целая часть', args: [''], defaults: [0] });
})(globalThis);
