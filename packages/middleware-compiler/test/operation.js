'use strict';

const Assert = require('assert');
const Compiler = require('../');
const Helpers = require('./lib/helpers');
const Lab = require('lab');

const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

module.exports = { lab };

describe('middleware compiler operation', { parallel: true }, () => {
    const nodejsCompiler = Helpers.nodejsCompiler;

    it('succeeds in producing a webtask function', done => {
        const script = `module.exports = cb => cb(null, 'OK');`;
        const meta = {};
        const compilerOptions = {
            meta,
            nodejsCompiler,
            script,
        };

        return Compiler(compilerOptions, (error, webtaskFn) => {
            Assert.ifError(error);
            Assert.equal(typeof webtaskFn, 'function');

            done();
        });
    });

    it('succeeds in producing a webtask function with a middleware', done => {
        const script = `module.exports = cb => cb(null, 'OK');`;
        const meta = {
            'wt-middleware': '@webtask/bearer-auth-middleware',
        };
        const compilerOptions = {
            meta,
            nodejsCompiler,
            script,
        };

        return Compiler(compilerOptions, (error, webtaskFn) => {
            Assert.ifError(error);
            Assert.equal(typeof webtaskFn, 'function');

            done();
        });
    });

    it('succeeds in producing a webtask function with a middleware and enables debug logging', done => {
        const script = `module.exports = cb => cb(null, 'OK');`;
        const meta = {
            'wt-debug': 'wt-middleware',
            'wt-middleware': '@webtask/bearer-auth-middleware',
        };
        const compilerOptions = {
            meta,
            nodejsCompiler,
            script,
        };

        return Compiler(compilerOptions, (error, webtaskFn) => {
            Assert.ifError(error);
            Assert.equal(typeof webtaskFn, 'function');

            done();
        });
    });

    it('succeeds in producing a webtask function with a middleware specified as JSON', done => {
        const script = `module.exports = cb => cb(null, 'OK');`;
        const meta = {
            'wt-middleware': JSON.stringify([
                '@webtask/bearer-auth-middleware',
            ]),
        };
        const compilerOptions = {
            meta,
            nodejsCompiler,
            script,
        };

        return Compiler(compilerOptions, (error, webtaskFn) => {
            Assert.ifError(error);
            Assert.equal(typeof webtaskFn, 'function');

            done();
        });
    });

    it('fails to produce a webtask function with a middleware specified as JSON that is not a valid array', done => {
        const script = `module.exports = cb => cb(null, 'OK');`;
        const meta = {
            'wt-middleware': JSON.stringify({
                wrong: '@webtask/bearer-auth-middleware',
            }),
        };
        const compilerOptions = {
            meta,
            nodejsCompiler,
            script,
        };

        return Compiler(compilerOptions, (error, webtaskFn) => {
            Assert.ok(error);
            Assert.equal(typeof webtaskFn, 'undefined');

            done();
        });
    });

    describe('pipeline execution', { parallel: true }, () => {
        const createPipeline = Helpers.createPipeline;
        const invokePipeline = Helpers.invokePipeline;

        it('responds with an error when the underlying webtask code is invalid javascript', done => {
            const script = `module.exports = this is how it works, right?`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 500);

                        done();
                    });
                }
            );
        });

        it('responds with an error when the underlying webtask exports a method that does not conform to the webtask programming model', done => {
            const script = `module.exports = (ctx, req, res, giraffe) => giraffe()`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 500);

                        done();
                    });
                }
            );
        });

        it('handles a non-Error error argument in the callback when running a 1ary webtask without middleware', done => {
            const script = `module.exports = cb => cb('Oops');`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 500);

                        done();
                    });
                }
            );
        });

        it('handles objects that cannot be stringified that are passed to the callback when running a 1ary webtask without middleware', done => {
            const script = `module.exports = cb => { const recurse = {}; recurse.recurse = recurse; cb(null, recurse); }`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 500);

                        done();
                    });
                }
            );
        });

        it('succeeds in running a 1ary webtask without middleware', done => {
            const script = `module.exports = cb => cb(null, 'OK');`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 200);
                        Assert.equal(res.payload, '"OK"');

                        done();
                    });
                }
            );
        });

        it('succeeds in running a 1ary webtask without middleware twice in sequence', done => {
            const script = `module.exports = cb => cb(null, 'OK');`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 200);
                        Assert.equal(res.payload, '"OK"');

                        return invokePipeline(webtaskFn, {}, res => {
                            Assert.equal(res.statusCode, 200);
                            Assert.equal(res.payload, '"OK"');

                            done();
                        });
                    });
                }
            );
        });

        it('succeeds in running a 2ary webtask without middleware', done => {
            const script = `module.exports = (ctx, cb) => cb(null, 'OK');`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 200);
                        Assert.equal(res.payload, '"OK"');

                        done();
                    });
                }
            );
        });

        it('succeeds in running a 1ary webtask with a payload body, but without middleware', done => {
            const script = `module.exports = (ctx, cb) => cb(null, ctx.body);`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    const method = 'POST';
                    const payload = { json: 'body' };

                    return invokePipeline(
                        webtaskFn,
                        { method, payload },
                        res => {
                            Assert.equal(res.statusCode, 200);
                            Assert.equal(res.payload, JSON.stringify(payload));

                            done();
                        }
                    );
                }
            );
        });

        it('succeeds in running a 2ary webtask with a payload body, but without middleware', done => {
            const script = `module.exports = (ctx, cb) => cb(null, ctx.body);`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    const method = 'POST';
                    const payload = { json: 'body' };

                    return invokePipeline(
                        webtaskFn,
                        { method, payload },
                        res => {
                            Assert.equal(res.statusCode, 200);
                            Assert.equal(res.payload, JSON.stringify(payload));

                            done();
                        }
                    );
                }
            );
        });

        it('responds with an error when running a 2ary webtask with an invalid payload body, but without middleware', done => {
            const script = `module.exports = (ctx, cb) => cb(null, ctx.body);`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    const headers = {
                        'Content-Type': 'application/json',
                    };
                    const method = 'POST';
                    const payload = 'this is not the json you were looking for';

                    return invokePipeline(
                        webtaskFn,
                        { headers, method, payload },
                        res => {
                            Assert.equal(res.statusCode, 500);

                            done();
                        }
                    );
                }
            );
        });

        it('succeeds in running a 3ary webtask with a payload body, with the bodyParser.json middleware', done => {
            const script = `module.exports = (ctx, req, res) => { res.writeHead(200, { 'Content-Type': 'application-json' }); res.end(JSON.stringify(req.body)); };`;
            const middlewareSpecs = ['body-parser/json'];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    const headers = {
                        'Content-Type': 'application/json',
                    };
                    const method = 'POST';
                    const payload = { json: 'body' };

                    return invokePipeline(
                        webtaskFn,
                        { headers, method, payload },
                        res => {
                            Assert.equal(res.statusCode, 200);
                            Assert.equal(res.payload, JSON.stringify(payload));

                            done();
                        }
                    );
                }
            );
        });

        it('succeeds in running a 3ary webtask without middleware', done => {
            const script = `module.exports = (ctx, req, res) => { res.writeHead(200); res.end('OK'); };`;
            const middlewareSpecs = [];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 200);
                        Assert.equal(res.payload, 'OK');

                        done();
                    });
                }
            );
        });

        it('succeeds in running a webtask with middleware', done => {
            const script = `module.exports = cb => cb(null, 'OK');`;
            const middlewareSpecs = ['@webtask/bearer-auth-middleware'];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    return invokePipeline(webtaskFn, {}, res => {
                        Assert.equal(res.statusCode, 200);
                        Assert.equal(res.payload, '"OK"');

                        done();
                    });
                }
            );
        });

        it('succeeds in running a webtask with middleware that intercepts the response', done => {
            const script = `module.exports = cb => cb(null, 'OK');`;
            const middlewareSpecs = ['@webtask/bearer-auth-middleware'];

            return createPipeline(
                { script, middlewareSpecs },
                (error, webtaskFn) => {
                    Assert.ifError(error);

                    const secrets = {
                        'wt-auth-secret': 'secret',
                    };

                    return invokePipeline(webtaskFn, { secrets }, res => {
                        Assert.equal(res.statusCode, 401);

                        done();
                    });
                }
            );
        });

        it(
            'succeeds in running a webtask with a url-based middleware that passes on the response',
            (done, onCleanup) => {
                const script = `module.exports = cb => cb(null, 'OK');`;
                const middleware = `
                    module.exports = () => (req, res, next) => next();
                `;
                return Helpers.spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanup(server.stop);

                    const middlewareSpecs = [server.baseUrl];

                    return createPipeline(
                        { script, middlewareSpecs },
                        (error, webtaskFn) => {
                            Assert.ifError(error);

                            const secrets = {
                                'wt-auth-secret': 'secret',
                            };

                            return invokePipeline(
                                webtaskFn,
                                { secrets },
                                res => {
                                    Assert.equal(res.statusCode, 200);
                                    Assert.equal(res.payload, '"OK"');

                                    done();
                                }
                            );
                        }
                    );
                });
            }
        );

        it(
            'succeeds in running a webtask with a single middleware that reassigns the script to a custom function',
            (done, onCleanup) => {
                const script = `module.exports = cb => cb(null, 'This function will be reassigned');`;
                // Any time the script is reassigned, `req.webtaskContext.compiler.nodejsCompiler` must be decorated with optional compilation.
                // For more context, see https://github.com/auth0/webtask-userspace/blob/f337550a007bf10d3f2d71395822501008c152dc/packages/middleware-compiler/index.js#L48-L62
                // and https://github.com/auth0/webtask-userspace/blob/f337550a007bf10d3f2d71395822501008c152dc/packages/middleware-compiler/lib/middleware.js#L36-L39
                const middleware = `
                  module.exports = () => (req, res, next) => {
                    const defaultCompiler = req.webtaskContext.compiler.nodejsCompiler;
                    const optionallyCompile = (s, cb) => typeof s === 'function' ? cb(null, s) : defaultCompiler(s, cb);
                    req.webtaskContext.compiler.nodejsCompiler = optionallyCompile;
                    req.webtaskContext.compiler.script = cb => cb(null, 'OK');
                    return next();
                  }
                `;

                return Helpers.spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanup(server.stop);

                    const middlewareSpecs = [server.baseUrl];

                    return createPipeline(
                        { script, middlewareSpecs },
                        (error, webtaskFn) => {
                            Assert.ifError(error);

                            return invokePipeline(
                                webtaskFn,
                                {},
                                res => {
                                    Assert.equal(res.statusCode, 200);
                                    Assert.equal(res.payload, '"OK"');

                                    done();
                                }
                            );
                        }
                    );
                });
            }
        );

        it(
            'succeeds in running a webtask with compiler middleware and custom programming model',
            (done, onCleanup) => {
                const script = `module.exports = async (context) => 'OK';`;
                const middleware = `
                  module.exports = () => (req, res, next) => {
                    const defaultCompiler = req.webtaskContext.compiler.nodejsCompiler;
                    const optionallyCompile = (s, cb) => typeof s === 'function' ? cb(null, s) : defaultCompiler(s, cb);
                    req.webtaskContext.compiler.nodejsCompiler = optionallyCompile;
                    return req.webtaskContext.compiler.nodejsCompiler(req.webtaskContext.compiler.script, function(compilerError, code) {
                      if (compilerError) return next(compilerError);
                      const webtask = require('util').callbackify(code);
                      req.webtaskContext.compiler.script = (context, cb) => webtask(context, cb);
                      return next();
                    });
                  };
                `;
                return Helpers.spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanup(server.stop);

                    const middlewareSpecs = [server.baseUrl];

                    return createPipeline(
                        { script, middlewareSpecs },
                        (error, webtaskFn) => {
                            Assert.ifError(error);

                            return invokePipeline(
                                webtaskFn,
                                {},
                                res => {
                                    Assert.equal(res.statusCode, 200);
                                    Assert.equal(res.payload, '"OK"');

                                    done();
                                }
                            );
                        }
                    );
                });
            }
        );

        it(
            'succeeds in running a webtask with a compiler followed by multiple middleware functions',
            (done, onCleanup) => {
                const script = `module.exports = cb => cb(null, 'OK');`;
                const middleware = (req, res) => {
                    res.writeHead(200, {'Content-Type': 'application/javascript'});
                    const router = {
                      '/compiler': `
                        module.exports = () => (req, res, next) => {
                          const nodejsCompiler = req.webtaskContext.compiler.nodejsCompiler;
                          const optionallyCompile = (s, cb) => typeof s === 'function' ? cb(null, s) : nodejsCompiler(s, cb);
                          req.webtaskContext.compiler.nodejsCompiler = optionallyCompile;
                          return req.webtaskContext.compiler.nodejsCompiler(req.webtaskContext.compiler.script, function(compilerError, webtask) {
                            if (compilerError) return next(compilerError);
                            req.webtaskContext.compiler.script = webtask;
                            return next();
                          });
                        };
                      `,
                      '/auth': `
                        module.exports = () => (req, res, next) => {
                          const isAuthorized = true;
                          if (!isAuthorized) return next(new Error('Not autorized!'));
                          return next();
                        };
                      `,
                      '/noop': `module.exports = () => (req, res, next) => next();`
                    };
                    res.end(router[req.url]);
                };
                return Helpers.spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanup(server.stop);

                    const middlewareSpecs = [
                        `${server.baseUrl}/compiler`,
                        `${server.baseUrl}/auth`,
                        `${server.baseUrl}/noop`,
                    ];

                    return createPipeline(
                        { script, middlewareSpecs },
                        (error, webtaskFn) => {
                            Assert.ifError(error);

                            return invokePipeline(
                                webtaskFn,
                                {},
                                res => {
                                    Assert.equal(res.statusCode, 200);
                                    Assert.equal(res.payload, '"OK"');

                                    done();
                                }
                            );
                        }
                    );
                });
            }
        );

        it(
            'succeeds in running a webtask with composed compilers',
            (done, onCleanup) => {
                const script = `module.exports = cb => cb(null, 'OK');`;
                const middleware = (req, res) => {
                    res.writeHead(200, {'Content-Type': 'application/javascript'});
                    const router = {
                      '/compose': `
                        module.exports = () => (req, res, next) => {
                          const nodejsCompiler = req.webtaskContext.compiler.nodejsCompiler;
                          const optionallyCompile = (s, cb) => typeof s === 'function' ? cb(null, s) : nodejsCompiler(s, cb);
                          req.webtaskContext.compiler.nodejsCompiler = optionallyCompile;
                          return next();
                        }
                      `,
                      '/promisify': `
                        module.exports = () => (req, res, next) => {
                          return req.webtaskContext.compiler.nodejsCompiler(req.webtaskContext.compiler.script, function(compilerError, webtask) {
                            if (compilerError) return next(compilerError);
                            req.webtaskContext.compiler.script = require('util').promisify(webtask);
                            return next();
                          });
                        };
                      `,
                      '/callbackify': `
                        module.exports = () => (req, res, next) => {
                          return req.webtaskContext.compiler.nodejsCompiler(req.webtaskContext.compiler.script, function(compilerError, code) {
                            if (compilerError) return next(compilerError);
                            const webtask = require('util').callbackify(code);
                            req.webtaskContext.compiler.script = (cb) => webtask(cb);
                            return next();
                          });
                        };
                      `
                    };
                    res.end(router[req.url]);
                };
                return Helpers.spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanup(server.stop);

                    const middlewareSpecs = [
                        `${server.baseUrl}/compose`,
                        `${server.baseUrl}/promisify`,
                        `${server.baseUrl}/callbackify`,
                    ];

                    return createPipeline(
                        { script, middlewareSpecs },
                        (error, webtaskFn) => {
                            Assert.ifError(error);

                            return invokePipeline(
                                webtaskFn,
                                {},
                                res => {
                                    Assert.equal(res.statusCode, 200);

                                    done();
                                }
                            );
                        }
                    );
                });
            }
        );

        it(
            'succeeds in running a webtask with a url-based middleware that intercepts on the response',
            (done, onCleanup) => {
                const script = `module.exports = cb => cb(null, 'OK');`;
                const middleware = `
                    module.exports = () => (req, res, next) => { res.writeHead(200); res.end('MIDDLEWARE'); };
                `;
                return Helpers.spawnServer(middleware, (error, server) => {
                    Assert.ifError(error);

                    onCleanup(server.stop);

                    const middlewareSpecs = [server.baseUrl];

                    return createPipeline(
                        { script, middlewareSpecs },
                        (error, webtaskFn) => {
                            Assert.ifError(error);

                            const secrets = {
                                'wt-auth-secret': 'secret',
                            };

                            return invokePipeline(
                                webtaskFn,
                                { secrets },
                                res => {
                                    Assert.equal(res.statusCode, 200);
                                    Assert.equal(res.payload, 'MIDDLEWARE');

                                    done();
                                }
                            );
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
