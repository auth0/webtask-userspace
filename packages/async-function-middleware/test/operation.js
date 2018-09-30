'use strict';

const Assert = require('assert');
const Hoek = require('hoek');
const Lab = require('lab');
const Shot = require('shot');
const Helpers = require('./lib/helpers');
const AsyncFunctionMiddleware = require('../');

const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

module.exports = { lab };

describe('async function middleware', () => {
    it('succeeds in running a webtask that exports an async function and returns a result', done => {
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
                script: "module.exports = async (context) => 'OK';"
            }
        });

        return run({}, (error, webtask) => {
            Assert.ifError(error);

            webtask({}, (error, result) => {
                Assert.ifError(error);
                Assert.equal(result, 'OK');

                return done();
            });
        });
    });

    it('responds with an error when a webtask exports an async function and throws an error', done => {
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
                script: "module.exports = async (context) => { throw new Error('OOPS') };"
            }
        });

        return run({}, (error, webtask) => {
            Assert.ifError(error);

            webtask({}, (error, result) => {
                Assert(error);
                Assert.equal(error.message, 'OOPS');
                Assert.equal(result, undefined);

                return done();
            });
        });
    });

    it('succeeds in running a webtask that returns a promise resolution', done => {
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
                script: "module.exports = (context) => Promise.resolve('OK');"
            }
        });

        return run({}, (error, webtask) => {
            Assert.ifError(error);

            webtask({}, (error, result) => {
                Assert.ifError(error);
                Assert.equal(result, 'OK');

                return done();
            });
        });
    });

    it('responds with an error when a webtask returns a promise rejection', done => {
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
                script: "module.exports = (context) => Promise.reject(new Error('OOPS'));"
            }
        });

        return run({}, (error, webtask) => {
            Assert.ifError(error);

            webtask({}, (error, result) => {
                Assert(error);
                Assert.equal(error.message, 'OOPS');
                Assert.equal(result, undefined);

                return done();
            });
        });
    });

    it('responds with an error when the webtask is invalid javascript', done => {
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
                script: "module.exports = This is how it works, right?"
            }
        });

        return run({}, (error, webtask) => {
            Assert(error);
            Assert.equal(webtask, undefined);

            return done();
        });
    });
});

function createMockRunner(webtaskContext) {
    if (!webtaskContext) webtaskContext = {};

    const middlewareFn = AsyncFunctionMiddleware();

    return function run(requestOptions, next) {
        const defaultWebtaskContext = {
            headers: requestOptions.headers || {}
        };

        const dispatchFn = (req, res) => {
            req.webtaskContext = Hoek.applyToDefaults(
                defaultWebtaskContext,
                webtaskContext
            );

            return middlewareFn(req, res, (middlewareError) => {
                if (middlewareError) return next(middlewareError);
                next(null, req.webtaskContext.compiler.script);
            });
        };

        const defaultRequestOptions = { url: '/' };

        return Shot.inject(
            dispatchFn,
            Hoek.applyToDefaults(defaultRequestOptions, requestOptions),
            res => Assert.fail(res, null, 'Unexpected response')
        );
    };
}

if (require.main === module) {
    Lab.report([lab], { output: process.stdout, progress: 2 });
}
