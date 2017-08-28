'use strict';

const Assert = require('assert');
const Auth0Middleware = require('../');
const Hoek = require('hoek');
const Lab = require('lab');
const Shot = require('shot');

const lab = Lab.script();
const { describe, it } = lab;

module.exports = { lab };

describe('cron authentication middleware', { parallel: false }, () => {
    it('throws if the AUTH0_AUDIENCE secret is missing', done => {
        const run = createMockRunner({ secrets: {} });

        Assert.throws(() => {
            run({}, error => Assert.ifError(error));
        });

        return done();
    });

    it('throws if the AUTH0_DOMAIN secret is missing', done => {
        const run = createMockRunner({
            secrets: {
                AUTH0_AUDIENCE: 'foo',
            },
        });

        Assert.throws(() => {
            run({}, error => Assert.ifError(error));
        });

        return done();
    });

    it('throws if the AUTH0_DOMAIN secret is a non-https uri', done => {
        const run = createMockRunner({
            secrets: {
                AUTH0_AUDIENCE: 'foo',
                AUTH0_DOMAIN: 'http://bad.domain',
            },
        });

        Assert.throws(() => {
            run({}, error => Assert.ifError(error));
        });

        return done();
    });

    it('throws if the AUTH0_ALGORITHM secret represents an unsupported algorithm', done => {
        const run = createMockRunner({
            secrets: {
                AUTH0_AUDIENCE: 'foo',
                AUTH0_DOMAIN: 'https://good.domain',
                AUTH0_ALGORITHM: 'BLIND_TRUST',
            },
        });

        Assert.throws(() => {
            run({}, error => Assert.ifError(error));
        });

        return done();
    });

    describe('using the HS256 algorithm', { parallel: true }, () => {
        it('throws if the AUTH0_API_SECRET is missing', done => {
            const run = createMockRunner({
                secrets: {
                    AUTH0_ALGORITHM: 'HS256',
                    AUTH0_AUDIENCE: 'foo',
                    AUTH0_DOMAIN: 'https://good.domain',
                },
            });

            Assert.throws(() => {
                run({}, error => Assert.ifError(error));
            });

            return done();
        });

        it('rejects a request with a missing token', done => {
            const run = createMockRunner({
                secrets: {
                    AUTH0_ALGORITHM: 'HS256',
                    AUTH0_AUDIENCE: 'foo',
                    AUTH0_DOMAIN: 'https://good.domain',
                    AUTH0_API_SECRET: 'good horse battery staple',
                },
            });

            return run({}, error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            });
        });

        it('rejects a request with a missing token, using a cached middleware instance', done => {
            const run = createMockRunner({
                secrets: {
                    AUTH0_ALGORITHM: 'HS256',
                    AUTH0_AUDIENCE: 'foo',
                    AUTH0_DOMAIN: 'https://good.domain',
                    AUTH0_API_SECRET: 'good horse battery staple',
                },
            });

            return run({}, error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return run({}, error => {
                    Assert.ok(error);
                    Assert.equal(error.statusCode, 401);

                    return done();
                });
            });
        });

        it('rejects a request with an invalid token', done => {
            const run = createMockRunner({
                headers: {
                    Authorization: 'Bearer foo',
                },
                secrets: {
                    AUTH0_ALGORITHM: 'HS256',
                    AUTH0_AUDIENCE: 'foo',
                    AUTH0_DOMAIN: 'https://good.domain',
                    AUTH0_API_SECRET: 'good horse battery staple',
                },
            });

            return run({}, error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            });
        });

        it.skip('succeeds for a request with a valid token', done => {
            return done();
        });
    });

    describe('using the RS256 algorithm', { parallel: true }, () => {
        it('rejects a request with a missing token', done => {
            const run = createMockRunner({
                secrets: {
                    AUTH0_ALGORITHM: 'RS256',
                    AUTH0_AUDIENCE: 'foo',
                    AUTH0_DOMAIN: 'https://good.domain',
                },
            });

            return run({}, error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            });
        });

        it('rejects a request with an invalid token', done => {
            const run = createMockRunner({
                headers: {
                    Authorization: 'Bearer foo',
                },
                secrets: {
                    AUTH0_ALGORITHM: 'RS256',
                    AUTH0_AUDIENCE: 'foo',
                    AUTH0_DOMAIN: 'https://good.domain',
                },
            });

            return run({}, error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            });
        });

        it.skip('succeeds for a request with a valid token', done => {
            return done();
        });
    });
});

function createMockRunner(webtaskContext = {}) {
    const middlewareFn = Auth0Middleware();

    return function run(requestOptions, next) {
        const defaultWebtaskContext = {
            headers: requestOptions.headers || {},
        };
        const dispatchFn = (req, res) => {
            req.webtaskContext = Hoek.applyToDefaults(
                defaultWebtaskContext,
                webtaskContext
            );

            return middlewareFn(req, res, next);
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
