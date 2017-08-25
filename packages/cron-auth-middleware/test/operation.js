'use strict';

const Assert = require('assert');
const CronAuthMiddleware = require('../');
const Crypto = require('crypto');
const Lab = require('lab');
const Shot = require('shot');

const lab = Lab.script();
const { describe, it } = lab;

module.exports = { lab };

describe('cron authentication middleware', { parallel: true }, () => {
    it('accepts a request with the correct authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ token });

        return run(
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            error => {
                Assert.ifError(error);

                return done();
            }
        );
    });

    it('rejects a request missing a token in the webtask context', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({});

        return run(
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            }
        );
    });

    it('rejects a request without an authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ token });

        return run({}, error => {
            Assert.ok(error);
            Assert.equal(error.statusCode, 401);

            return done();
        });
    });

    it('rejects a request with a malformed authorization header', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ token });

        return run(
            {
                headers: {
                    Authorization: `Wrong ${token}`,
                },
            },
            error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            }
        );
    });

    it('rejects a request with the wrong bearer token', done => {
        const token = Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({ token });

        return run(
            {
                headers: {
                    Authorization: `Bearer thisisnotthecorrecttoken`,
                },
            },
            error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            }
        );
    });
});

function createMockRunner(webtaskContext = {}) {
    const middlewareFn = CronAuthMiddleware();

    return function run(requestOptions, next) {
        const dispatchFn = (req, res) => {
            req.webtaskContext = webtaskContext;

            return middlewareFn(req, res, next);
        };

        const defaultRequestOptions = { url: '/' };

        return Shot.inject(
            dispatchFn,
            Object.assign(defaultRequestOptions, requestOptions),
            res => Assert.fail(res, null, 'Unexpected response')
        );
    };
}

if (require.main === module) {
    Lab.report([lab], { output: process.stdout, progress: 2 });
}
