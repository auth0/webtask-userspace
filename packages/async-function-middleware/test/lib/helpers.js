const Module = require('module');
const Vm = require('vm');

module.exports = {
  nodejsCompiler
};

function nodejsCompiler(script, cb) {
  try {
      const wrapper = Module.wrap(script);
      const wrapperFn = Vm.runInNewContext(wrapper);
      const exports = {};
      const module = { exports };

      wrapperFn(exports, require, module, 'async-function-middleware.js', '/');

      return process.nextTick(cb, null, module.exports);
  } catch (e) {
      return process.nextTick(cb, e);
  }
}