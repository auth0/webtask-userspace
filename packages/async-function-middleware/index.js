'use strict';
const optionalCompilerMiddleware = require('@webtask/optional-compiler-middleware')();
const { callbackify } = require('util');
module.exports = createAsyncFunctionMiddleware;

function createAsyncFunctionMiddleware() {
  return function asyncFunctionMiddleware(req, res, next) {
    return optionalCompilerMiddleware(req, res, function() {
      const { nodejsCompiler, script } = req.webtaskContext.compiler;
      return nodejsCompiler(script, function(compilerError, code) {
        if (compilerError) return next(compilerError);
        const webtask = callbackify(code);
        req.webtaskContext.compiler.script = (context, cb) => webtask(context, cb);
        return next();
      });
    });
  };
}
