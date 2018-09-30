'use strict';
const hasOptionalCompilation = Symbol('hasOptionalCompilation');
module.exports = createOptionalCompilerMiddleware;

function createOptionalCompilerMiddleware() {
  return function optionalCompilerMiddleware(req, res, next) {
    const defaultCompiler = req.webtaskContext.compiler.nodejsCompiler;
    if (req.webtaskContext.compiler[hasOptionalCompilation]) return next();
    req.webtaskContext.compiler[hasOptionalCompilation] = true;
    req.webtaskContext.compiler.nodejsCompiler = function(script, cb) {
      typeof script === 'function' ? cb(null, script) : defaultCompiler(script, cb);
    };
    return next();
  };
}
