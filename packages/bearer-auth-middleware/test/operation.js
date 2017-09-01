'use strict';

const Assert = require('assert');
const AuthMiddleware = require('../');
const Crypto = require('crypto');
const Hoek = require('hoek');
const Lab = require('lab');
const Shot = require('shot');

const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

module.exports = { lab };

describe('cron authentication middleware', { parallel: false }, () => {
    it('accepts a request with the correct authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ secrets: { 'wt-auth-secret': token } });

        return run(
            {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            },
            error => {
                Assert.ifError(error);

                return done();
            }
        );
    });

    it('accepts a request without an auth secret', done => {
        const run = createMockRunner();

        return run({}, error => {
            Assert.ifError(error);

            return done();
        });
    });

    it('accepts a request without an auth secret but with an authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner();

        return run(
            {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            },
            error => {
                Assert.ifError(error);

                return done();
            }
        );
    });

    it('rejects a request with an incorrect authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ secrets: { 'wt-auth-secret': token } });

        return run(
            {
                headers: {
                    authorization: `Bearer thisisnotthetokenyouwerelookingfor`,
                },
            },
            error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            }
        );
    });

    it('rejects a request with an invalid authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ secrets: { 'wt-auth-secret': token } });

        return run(
            {
                headers: {
                    authorization: `Wrong ${token}`,
                },
            },
            error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            }
        );
    });

    it('rejects a request missing authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ secrets: { 'wt-auth-secret': token } });

        return run({}, error => {
            Assert.ok(error);
            Assert.equal(error.statusCode, 401);

            return done();
        });
    });
});

function createMockRunner(webtaskContext) {
    if (!webtaskContext) webtaskContext = {};

    const middlewareFn = AuthMiddleware();

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
