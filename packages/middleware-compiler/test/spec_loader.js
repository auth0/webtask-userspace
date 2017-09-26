'use strict';

const Assert = require('assert');
const Helpers = require('./lib/helpers');
const Lab = require('lab');
const Util = require('../lib/util');

const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

module.exports = { lab };

describe('middleware spec loader', { parallel: true }, () => {
    const debuglog = () => undefined;
    const nodejsCompiler = Helpers.nodejsCompiler;

    it('fails to load a non-string spec', done => {
        return Util.resolveMiddlewareFunction(
            123456,
            { debuglog, nodejsCompiler },
            (error, middlewareFn) => {
                Assert.ok(error);
                Assert.equal(middlewareFn, undefined);

                done();
            }
        );
    });

    describe('module specs', { parallel: true }, () => {
        it('succeeds loading an npm middleware function', done => {
            return Util.resolveMiddlewareFunction(
                '@webtask/bearer-auth-middleware',
                { debuglog, nodejsCompiler },
                (error, middlewareFn) => {
                    Assert.ifError(error);
                    Assert.equal(typeof middlewareFn, 'function');

                    done();
                }
            );
        });

        it('succeeds loading an npm middleware function via export', done => {
            return Util.resolveMiddlewareFunction(
                'body-parser/json',
                { debuglog, nodejsCompiler },
                (error, middlewareFn) => {
                    Assert.ifError(error);
                    Assert.equal(typeof middlewareFn, 'function');

                    done();
                }
            );
        });

        it('fails to load a module that is not available', done => {
            return Util.resolveMiddlewareFunction(
                '@webtask/this-will-never-exist',
                { debuglog, nodejsCompiler },
                (error, middlewareFn) => {
                    Assert.ok(error);
                    Assert.equal(middlewareFn, undefined);

                    done();
                }
            );
        });
    });

    describe('url specs', { parallel: true }, () => {
        const spawnServer = Helpers.spawnServer;

        it(
            'succeeds loading a middleware function from a url',
            (done, onCleanUp) => {
                const middleware = `
                    module.exports = () => (req, res, next) => next();
                `;
                return spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanUp(server.stop);

                    const middlewareSpec = server.baseUrl;

                    return Util.resolveMiddlewareFunction(
                        middlewareSpec,
                        { debuglog, nodejsCompiler },
                        (error, middlewareFn) => {
                            Assert.ifError(error);
                            Assert.equal(typeof middlewareFn, 'function');

                            return done();
                        }
                    );
                });
            }
        );

        it(
            'fails to load a middleware function from a url whose code does not export a valid middleware function',
            (done, onCleanUp) => {
                const middleware = `
                    module.exports = 'NOT A FUNCTION, JOE. DEFINITELY NOT A FUNCTION.';
                `;
                return spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanUp(server.stop);

                    const middlewareSpec = server.baseUrl;

                    return Util.resolveMiddlewareFunction(
                        middlewareSpec,
                        { debuglog, nodejsCompiler },
                        (error, middlewareFn) => {
                            Assert.ok(error);
                            Assert.equal(middlewareFn, undefined);

                            return done();
                        }
                    );
                });
            }
        );

        it(
            'fails to load a middleware function from a url whose code is not valid javascript',
            (done, onCleanUp) => {
                const middleware = `
                    module.exports = can has cheezburger?;
                `;
                return spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanUp(server.stop);

                    const middlewareSpec = server.baseUrl;

                    return Util.resolveMiddlewareFunction(
                        middlewareSpec,
                        { debuglog, nodejsCompiler },
                        (error, middlewareFn) => {
                            Assert.ok(error);
                            Assert.equal(middlewareFn, undefined);

                            return done();
                        }
                    );
                });
            }
        );

        it(
            'fails to load an middleware from a url returning a 404 error',
            (done, onCleanUp) => {
                const handler = (req, res) => {
                    res.writeHead(404);
                    res.end();
                };
                return spawnServer(handler, (error, server) => {
                    Assert.ifError(error);

                    onCleanUp(server.stop);

                    const middlewareSpec = server.baseUrl;

                    return Util.resolveMiddlewareFunction(
                        middlewareSpec,
                        { debuglog, nodejsCompiler },
                        (error, middlewareFn) => {
                            Assert.ok(error);
                            Assert.equal(middlewareFn, undefined);

                            return done();
                        }
                    );
                });
            }
        );
    });
});

if (require.main === module) {
    Lab.report([lab], { output: process.stdout, progress: 2 });
}
