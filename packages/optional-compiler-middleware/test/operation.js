'use strict';

const Assert = require('assert');
const Hoek = require('hoek');
const Lab = require('lab');
const Shot = require('shot');
const Helpers = require('./lib/helpers');
const OptionalCompilerMiddleware = require('../');

const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

module.exports = { lab };

describe('optional compiler middleware', () => {
    it('succeeds in decorating nodejsCompiler with optional compilation', done => {
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
            }
        });

        return run({}, (error, nodejsCompiler) => {
            Assert.ifError(error);
            Assert.equal(typeof nodejsCompiler, 'function');
            Assert.notDeepEqual(nodejsCompiler, Helpers.nodejsCompiler);
            const compilerChecksType = nodejsCompiler.toString().includes(`typeof script === 'function'`);
            Assert.ok(compilerChecksType);

            return done();
        });
    });

    it('succeeds in skipping if nodejsCompiler already has optional compilation', done => {
        const req = { webtaskContext: { compiler: { nodejsCompiler: Helpers.nodejsCompiler } } };
        OptionalCompilerMiddleware()(req, {}, () => {
            Assert.notDeepEqual(req.webtaskContext.compiler.nodejsCompiler, Helpers.nodejsCompiler);
            const compilerReference = req.webtaskContext.compiler.nodejsCompiler;

            OptionalCompilerMiddleware()(req, {}, error => {
                Assert.ifError(error);
                Assert.equal(typeof req.webtaskContext.compiler.nodejsCompiler, 'function');
                Assert.deepEqual(req.webtaskContext.compiler.nodejsCompiler, compilerReference);

                return done();
            });
        });
    });

    it('succeeds in optionally compiling a string', done => {
        const script = `module.exports = (cb) => cb(null, 'OK');`;
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
            }
        });

        return run({}, (middlewareError, nodejsCompiler) => {
            Assert.ifError(middlewareError);

            nodejsCompiler(script, (compilerError, webtask) => {
                Assert.ifError(compilerError)
                Assert.equal(typeof webtask, 'function');

                return done();
            });

        });
    });

    it('succeeds in optionally compiling a function', done => {
        const script = (cb) => cb(null, 'OK');
        const run = createMockRunner({
            compiler: {
                nodejsCompiler: Helpers.nodejsCompiler,
            }
        });

        return run({}, (middlewareError, nodejsCompiler) => {
            Assert.ifError(middlewareError);

            nodejsCompiler(script, (compilerError, webtask) => {
              Assert.ifError(compilerError)
              Assert.equal(typeof webtask, 'function');

              return done();
          });
        });
    });
});

function createMockRunner(webtaskContext) {
    if (!webtaskContext) webtaskContext = {};

    const middlewareFn = OptionalCompilerMiddleware();

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
                return next(null, req.webtaskContext.compiler.nodejsCompiler);
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
