var FOO_2 = (function() {

// 1) main function
var eval = function( str ) {     // (first rest)
  var t0 = new Date().getTime();
  var bal = balance( str );
  if (bal.left === bal.right) {
    str = eval_apos( str ); //'(first rest) -> [first rest]
    str = eval_ifs( str );  // (if bool then one else two)
    str = eval_lambdas( str );   // (lambda (:args*) body)
    str = eval_defs( str );      // (def name body)
    str = eval_forms( str );     // (first rest)
  }
  str = unquote( str );          // [+ 1 2] -> (+ 1 2)
  var t1 = new Date().getTime();
  return {val:str, bal:bal, time:t1-t0};
};
// 2) eval special and simple forms
// 2.1) (first rest)
var eval_forms = function(str) {
  var rex = /\(([^\s()]*)(?:[\s]*)([^()]*)\)/g;
  while (str != (str = str.replace( rex, 
    function(_,f,r) {
      r = r.trim().replace(/\s+/g, ' ');
      if (dict.hasOwnProperty(f))
        return dict[f].apply(null, r.split(' '));
      else
        return '(' + f + ' ' + r + ')'; 
    } ))) ;
  return str;
};
// 2.2) '(...)
var eval_apos = function(str) {
  while (true) {
    var s = catch_form("'(", str);
    if (s === 'none') break;
    str = str.replace("'"+s, eval_apo( s.trim()));
  }
  return str;
};
var eval_apo = function(s) {  // (+ 1 2)
  s = eval_apos(s);
  return quote(s);            // [+ 1 2]
};
// 2.3) (if bool then one else two)
var eval_ifs = function( str ) {
  while (true) {
    var s = catch_form('(if ', str);
    if (s === 'none') break;
    str = str.replace('(if '+s+')', eval_if( s.trim()));
  }
  return str;
};
var eval_if = function(s) {  // bool then one else two
  s = eval_ifs( s );
  return '(when ' + quote(s) + ')'
};
// 2.4) (lambda (:args*) body)
var eval_lambdas = function( str ) {
  while (true) {
    var s = catch_form('(lambda ', str);
    if (s === 'none') break;
    str = str.replace('(lambda '+s+')', eval_lambda(s.trim()));
  }
  return str;
};
var eval_lambda = function(s) { // (:args*) body
  s = eval_lambdas( s );
  var index = s.indexOf(')'),
      args = s.substring(1, index).split(' '),
      body = s.substring(index+2).trim(),
      name = 'lambda_' + Math.round(1e6*Math.random());
  for (var reg_args=[], i=0; i < args.length; i++)
    reg_args[i] = RegExp( args[i], 'g');
  dict[name] = function() {
    return function(bod, vals) {
      if (vals.length < args.length) {
        for (var i=0; i < vals.length; i++)
          bod = bod.replace( reg_args[i], vals[i] );
        var _args = args.slice(vals.length).join(' ');
        bod = '(' + _args + ') ' + bod;
        bod = eval_lambda( bod ); // create a lambda
      } else {                    // create a form
        for (var i=0; i < args.length; i++)
          bod = bod.replace( reg_args[i], vals[i] );
      }
      return bod;
    }(body, arguments);
  };
  return name; 
};
// 2.5) (def name body)
var eval_defs = function( str, flag ) {
  flag = (flag === undefined)? true : false;
  while (true) {
    var s = catch_form( '(def ', str );
    if (s === 'none') break;
    str = str.replace('(def '+s+')', eval_def( s.trim(), flag ));
  }
  return str;
};
var eval_def = function (s, flag) { // name body
  s = eval_defs( s, false );
  var index = s.indexOf(' '),
      name  = s.substring(0, index).trim(),
      body  = s.substring(index).trim(); 
  if (dict.hasOwnProperty(body)) {
    dict[name] = dict[body];
    delete dict[body];
  } else 
    dict[name] = function() { return body };
  return (flag)? name : '';
};

//////////////////////
// 3) helper functions
var balance = function ( str ) {
  var acc_strt    = str.match( /\(/g ), 
      acc_stop    = str.match( /\)/g ), 
      nb_acc_strt = (acc_strt)? acc_strt.length : 0,
      nb_acc_stop = (acc_stop)? acc_stop.length : 0;
  return {left:nb_acc_strt, right:nb_acc_stop}; 
};
var catch_form = function( symbol, str ) {
  var start = str.indexOf( symbol );
  if (start == -1) return 'none';
  var d0, d1, d2;
  if (symbol === "'(")     { d0 = 1; d1 = 1; d2 = 1; } 
  else if (symbol === "(") { d0 = 0; d1 = 0; d2 = 1; } 
  else         { d0 = 0; d1 = symbol.length; d2 = 0; }
  var nb = 1, index = start+d0;
  while(nb > 0) {
    index++;
    if ( str.charAt(index) == '(' ) nb++;
    else if ( str.charAt(index) == ')' ) nb--;
  }
  return str.substring( start+d1, index+d2 );
};
var quote = function(str) {
  return str.replace( /\(/g, '[' ).replace( /\)/g, ']' )
};
var unquote = function(str) {
  return str.replace( /\[/g, '(' ).replace( /\]/g, ')' ) 
};

////////////////
// 4) dictionary
var dict = {
'lib': function() {   // (lib)
  var str='dict:';
  for (var key in dict)
    if (key.substring(0,7) !== 'lambda_')
      str += ' ' + key;
  return str; 
},
'eval': function() {  // (eval '(+ 1 2))
  var s = [].slice.call(arguments).join(' ');
  return eval_forms(unquote(s))
},
'apply': function() { // (apply + 1 2)
  var s = [].slice.call(arguments),
      first = s.shift(),
      rest = s.join(' ');
  return eval_forms( '(' + first + ' ' + rest + ')' )
},
'when': function () { // (when 'bool then 'one else 'two)
  var s = [].slice.call(arguments).join(' '),
      index1 = s.indexOf( 'then' ),
      index2 = s.indexOf( 'else' ),
      bool = s.substring(0,index1).trim(),
      one = s.substring(index1+5,index2).trim(),
      two = s.substring(index2+5).trim();
  return (eval_forms(unquote(bool)) === "true")? 
          eval_forms(unquote(one)) : 
          eval_forms(unquote(two))
},
'+': function(){ // [1,2,3,...,n]
  return [].slice.call(arguments).reduce(function(x,y){return parseFloat(x)+parseFloat(y)})
},
'-': function(){ // [1,2,3,...,n]
  return [].slice.call(arguments).reduce(function(x,y){return x-y })
},
'*': function(){ // [1,2,3,...,n]
  return [].slice.call(arguments).reduce(function(x,y){return x*y })
},
'/': function(){ // [1,2,3,...,n]
  return [].slice.call(arguments).reduce(function(x,y){return x/y })
},
'sqrt': function(){ // [one]
  return Math.sqrt(arguments[0])
},
'<': function() {      // [one, two]
  return parseFloat(arguments[0]) < parseFloat(arguments[1])},
'=': function() {      // [one, two]
  var a = parseFloat(arguments[0]), 
      b = parseFloat(arguments[1]); 
  return !(a < b) && !(b < a) 
},
'equal?': function() { // [word1, word2]
  return arguments[0] === arguments[1]; 
},
'cons': function() { // (cons 12 34) -> lambda_1234
  var args = arguments;
  var name = 'lambda_' + Math.round(1e6*Math.random());
  dict[name] = function() { 
    return (arguments[0])? args[0] : args[1] 
  };
  return name
},
'car': function() {  // (car (cons 12 34)) -> 12
  return dict[arguments[0]](true)
},
'cdr': function() {  // (cdr (cons 12 34)) -> 34 
  return dict[arguments[0]](false)
}

};

/////////
// 5) public function
return {eval:eval}
})();
