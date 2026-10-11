/* Core: генерация текста программы из дерева (только для показа). */
(function (g) {
  'use strict';
  var Core = g.Core = g.Core || {};
  var A = Core.AST;

  var HOLE = '…';

  function quote(s) {
    return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function prec(n) {
    if (n && n.type === 'bin') return A.opInfo(n.op).prec;
    if (n && n.type === 'not') return 6;
    return 9;
  }

  function expr(n, minPrec) {
    if (!n) return HOLE;
    var s;
    switch (n.type) {
      case 'num': s = String(n.value); break;
      case 'str': s = quote(n.value); break;
      case 'bool': s = n.value ? 'истина' : 'ложь'; break;
      case 'var': s = n.name || HOLE; break;
      case 'not': s = 'не ' + expr(n.expr, 6); break;
      case 'bin': {
        var p = A.opInfo(n.op).prec;
        s = expr(n.left, p) + ' ' + A.opInfo(n.op).label + ' ' + expr(n.right, p + 1);
        break;
      }
      case 'call': s = (n.name || HOLE) + '(' + n.args.map(function (a) { return expr(a, 0); }).join(', ') + ')'; break;
      default: s = HOLE;
    }
    return prec(n) < (minPrec || 0) ? '(' + s + ')' : s;
  }

  function stmts(list, depth, out) {
    var pad = new Array(depth + 1).join('  ');
    list.forEach(function (n) {
      switch (n.type) {
        case 'let': out.push(pad + 'переменная ' + (n.name || HOLE) + ' = ' + expr(n.value)); break;
        case 'assign': out.push(pad + 'присвоить ' + (n.name || HOLE) + ' = ' + expr(n.value)); break;
        case 'change': out.push(pad + 'изменить ' + (n.name || HOLE) + ' на ' + expr(n.value)); break;
        case 'show': out.push(pad + 'показать ' + expr(n.value)); break;
        case 'return': out.push(pad + (n.value ? 'вернуть ' + expr(n.value) : 'вернуть')); break;
        case 'callstmt': out.push(pad + expr({ type: 'call', name: n.name, args: n.args })); break;
        case 'if':
          out.push(pad + 'если ' + expr(n.cond) + ' то');
          stmts(n.then, depth + 1, out);
          if (n.else.length) {
            out.push(pad + 'иначе');
            stmts(n.else, depth + 1, out);
          }
          out.push(pad + 'конец');
          break;
        case 'repeat':
          out.push(pad + 'повторить ' + expr(n.count) + ' раз');
          stmts(n.body, depth + 1, out);
          out.push(pad + 'конец');
          break;
        case 'while':
          out.push(pad + 'пока ' + expr(n.cond));
          stmts(n.body, depth + 1, out);
          out.push(pad + 'конец');
          break;
        case 'func':
          out.push(pad + 'функция ' + (n.name || HOLE) + '(' + n.params.join(', ') + ')');
          stmts(n.body, depth + 1, out);
          out.push(pad + 'конец');
          break;
        case 'on':
          out.push(pad + 'при событии ' + quote(n.event));
          stmts(n.body, depth + 1, out);
          out.push(pad + 'конец');
          break;
        default:
          out.push(pad + HOLE);
      }
    });
  }

  Core.codegen = function (program) {
    var out = [];
    stmts(program.body, 0, out);
    return out.join('\n');
  };
})(globalThis);
