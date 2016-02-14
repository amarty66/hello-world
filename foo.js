var FOO = (function() {
var eval = function(str) {
  while (str != (str = str.replace( 
   /\(([^\s()]*)(?:[\s]*)([^()]*)\)/g, 
   function(_,f,r) {
     return (dict.hasOwnProperty(f))?
     dict[f].apply(null, r.split(' ')) :
     '(' +  f + ' ' + r + ')';
   } ))) ;
  return str
};

var dict = {
'+': function(){return [].slice.call(arguments).reduce(function(x,y){return parseFloat(x)+parseFloat(y)})},
'-': function(){return [].slice.call(arguments).reduce(function(x,y){return x-y })},
'*': function(){return [].slice.call(arguments).reduce(function(x,y){return x*y })},
'/': function(){return [].slice.call(arguments).reduce(function(x,y){return x/y })},
'sqrt': function(){return Math.sqrt(arguments[0])}
};

return {eval:eval}
})();
