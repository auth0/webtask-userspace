'use strict';

const Compiler = require('../../');
const Http = require('http');
const Module = require('module');
const Shot = require('shot');
const Vm = require('vm');

module.exports = {
    createPipeline,
    invokePipeline,
    nodejsCompiler,
    spawnServer,
};

function createPipeline(options, cb) {
    const meta = {
        'wt-middleware': options.middlewareSpecs.join(','),
    };
    const compilerOptions = {
        meta,
        nodejsCompiler,
        script: options.script,
    };

    return Compiler(compilerOptions, cb);
}

function invokePipeline(webtaskFn, options, cb) {
    const dispatchFn = (req, res) => {
        const webtaskContext = {
            headers: req.headers,
            secrets: options.secrets || {},
        };

        return webtaskFn(webtaskContext, req, res);
    };
    const requestOptions = {
        headers: options.headers || {},
        method: options.method || 'GET',
        payload: options.payload,
        url: options.url || '/',
    };

    return Shot.inject(dispatchFn, requestOptions, cb);
}

function nodejsCompiler(script, cb) {
    try {
        const wrapper = Module.wrap(script);
        const wrapperFn = Vm.runInNewContext(wrapper);
        const exports = {};
        const module = { exports };

        wrapperFn(exports, require, module, 'middleware.js', '/');

        return process.nextTick(cb, null, module.exports);
    } catch (e) {
        return process.nextTick(cb, e);
    }
}

function spawnServer(handler, cb) {
    const handlerFn =
        typeof handler === 'function'
            ? handler
            : (req, res) => {
                  res.writeHead(200);
                  res.end(handler);
              };
    const server = Http.createServer(handlerFn);

    return server.listen(error => {
        if (error) {
            return cb(error);
        }

        const baseUrl = `http://localhost:${server.address().port}`;

        return cb(null, { baseUrl, stop });

        // Return a clean-up function
        function stop(cb) {
            return server.close(cb);
        }
    });
}
