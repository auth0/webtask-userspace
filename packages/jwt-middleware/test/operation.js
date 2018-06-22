'use strict';

const fs = require('fs');
const path = require('path');
const JwtMiddleware = require('../');
const jwt = require('jsonwebtoken');
const Assert = require('assert');
const Shot = require('shot');
const Lab = require('lab');
const Hoek = require('hoek');
const Crypto = require('crypto');
const Express = require('express');

const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

const WT_AUD = 'http://127.0.0.1:8721/';

// setup

const cert = fs.readFileSync(path.join(__dirname, './cert.pem'));

const json = {
    keys: [
        {
            alg: 'RSA256',
            kty: 'RSA',
            use: 'sig',
            x5c: [cert.toString()],
            kid: 'test',
        },
    ],
};

module.exports = { lab };

describe('JWT middleware operation', { parallel: false }, () => {
    let nextPort = 9000;

    it('should skip authn and authz if no wt-authorize-execution is present', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({
            meta: {},
        });

        return run(
            {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            },
            error => {
                return done(error);
            }
        );
    });

    it('should skip authn and authz if wt-authorize-execution is set to 0', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({
            meta: {
                'wt-authorize-execution': '0',
            },
        });

        return run(
            {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            },
            error => {
                return done(error);
            }
        );
    });

    it('should throw error if wt-authorize-execution is set and no authorization header is present', done => {
        const run = createMockRunner({
            meta: {
                'wt-authorize-execution': '1',
            },
        });

        return run(
            {
                headers: {},
            },
            error => {
                Assert.ok(error);
                Assert.ok(error.name.match(/AssertionError/));

                return done();
            }
        );
    });

    it('should throw error if token is not a real JWT token', done => {
        const port = nextPort++;
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({
            meta: {
                'wt-execution-iss': `http://127.0.0.1:${port}/`,
                'wt-execution-aud': WT_AUD,
                'wt-authorize-execution': '1',
            },
        });

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    Assert.ok(error);
                    Assert.equal(error.statusCode, 401);

                    return server.close(() => done());
                }
            );
        });
    });

    it('should authenticate and authorize with correct token and admin scope', done => {
        const port = nextPort++;
        const token = generateToken(
            'wt:admin',
            `http://127.0.0.1:${port}/`,
            WT_AUD
        );

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': WT_AUD,
                    'wt-authorize-execution': '1',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    return server.close(() => done(error));
                }
            );
        });
    });

    it('should authenticate and authorize with correct token and owner scope', done => {
        const port = nextPort++;
        const token = generateToken(
            'wt:owner:test_container',
            `http://127.0.0.1:${port}/`,
            WT_AUD
        );

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': WT_AUD,
                    'wt-authorize-execution': '1',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    return server.close(() => done(error));
                }
            );
        });
    });

    it('should authenticate and authorize with correct token and custom wt-execution-scope', done => {
        const port = nextPort++;
        const token = generateToken(
            'wt:custom_execution',
            `http://127.0.0.1:${port}/`,
            WT_AUD
        );

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': WT_AUD,
                    'wt-authorize-execution': '1',
                    'wt-execution-scope': 'wt:custom_execution',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    return server.close(() => done(error));
                }
            );
        });
    });

    it('should fail authentication due to invalid audience', done => {
        const port = nextPort++;
        const token = generateToken(
            'wt:admin',
            `http://127.0.0.1:${port}/`,
            WT_AUD
        );

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': 'http://google.com/',
                    'wt-authorize-execution': '1',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    Assert.ok(error);
                    Assert.equal(error.statusCode, 401);

                    return server.close(() => done());
                }
            );
        });
    });

    it('should fail authentication due to invalid issuer', done => {
        const port = nextPort++;
        const token = generateToken('wt:admin', 'http://google.com/', WT_AUD);

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': 'http://google.com/',
                    'wt-authorize-execution': '1',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    Assert.ok(error);
                    Assert.equal(error.statusCode, 401);

                    return server.close(() => done());
                }
            );
        });
    });

    it('should fail due to missing scopes', done => {
        const port = nextPort++;
        const token = generateToken(
            'wt:not_existant_scope',
            `http://127.0.0.1:${port}/`,
            WT_AUD
        );

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': WT_AUD,
                    'wt-authorize-execution': '1',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    Assert.ok(error);
                    Assert.equal(error.statusCode, 403);

                    return server.close(() => done());
                }
            );
        });
    });

    it('should fail due to scope being a string superset of wt:admin while wt:admin is not present', done => {
        const port = nextPort++;
        const token = generateToken(
            'wt:administrator wt:foo',
            `http://127.0.0.1:${port}/`,
            WT_AUD
        );

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': WT_AUD,
                    'wt-authorize-execution': '1',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    Assert.ok(error);
                    Assert.equal(error.statusCode, 403);

                    return server.close(() => done());
                }
            );
        });
    });

    it('should fail due to expired token', done => {
        const port = nextPort++;
        const token = generateToken(
            'wt:admin',
            `http://127.0.0.1:${port}/`,
            WT_AUD,
            -5000
        );

        const run = createMockRunner(
            {
                meta: {
                    'wt-execution-iss': `http://127.0.0.1:${port}/`,
                    'wt-execution-aud': WT_AUD,
                    'wt-authorize-execution': '1',
                },
            },
            {
                x_wt: {
                    container: 'test_container',
                },
            }
        );

        const app = Express();

        app.get('/.well-known/openid-configuration', (req, res) => {
            res.json({
                jwks_uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
            });
        });
        app.get('/.well-known/jwks.json', (req, res) => {
            res.json(json);
        });

        const server = app.listen(port, '127.0.0.1', () => {
            return run(
                {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
                error => {
                    Assert.ok(error);
                    Assert.equal(error.statusCode, 401);

                    return server.close(() => done());
                }
            );
        });
    });
});

// helpers
// -------

function createMockRunner(webtaskContext, customReq) {
    if (!webtaskContext) webtaskContext = {};

    const jwtMiddlewareFn = JwtMiddleware();

    return function run(requestOptions, next) {
        const defaultWebtaskContext = {
            headers: requestOptions.headers || {},
        };

        const dispatchFn = (req, res) => {
            req.webtaskContext = Hoek.applyToDefaults(
                defaultWebtaskContext,
                webtaskContext
            );

            if (customReq) req.x_wt = customReq.x_wt;

            try {
                return jwtMiddlewareFn(req, res, next);
            } catch (err) {
                return next(err);
            }
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

function generateToken(scopes, iss, aud, expiresIn) {
    const now = Date.now();
    const sandbox_key = fs.readFileSync(path.join(__dirname, './key.pem'));

    // By default, create a token expiring in 5s
    if (expiresIn === undefined) expiresIn = 5000;

    return jwt.sign(
        {
            sub: 'test', // or any other unique identifier representing the caller, for auditing purposes
            iss: iss,
            aud: aud,
            scope: scopes,
            iat: Math.floor(now / 1000),
            exp: Math.round((now + expiresIn) / 1000),
        },
        sandbox_key,
        {
            algorithm: 'RS256',
            keyid: process.env.CURRENT_KEYSET || 'test',
        }
    );
}
