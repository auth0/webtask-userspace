'use strict';

const JwtMiddleware = require('../');
const Assert = require('assert');
const Shot = require('shot');
const Lab = require('lab');
const Hoek = require('hoek');
const Crypto = require('crypto');

const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

module.exports = { lab };

describe('JWT middleware operation', { parallel: false }, () => {

    it ('shoud skip authn and authz if no wt-authorize-execution is present', done => {
        const token =  Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({
            meta: {}
        });

        return run(
            {
                headers: {
                    authorization: `Bearer ${token}`
                }
            },
            error => {
                Assert.ifError(error);

                return done();
            }
        )
    });

    it ('shoud skip authn and authz if wt-authorize-execution is set to 0', done => {
        const token =  Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({
            meta: {
                "wt-authorize-execution": "0"
            }
        });

        return run(
            {
                headers: {
                    authorization: `Bearer ${token}`
                }
            },
            error => {
                Assert.ifError(error);

                return done();
            }
        )
    });

    it ('shoud throw error if wt-authorize-execution is set and no authorization header is present', done => {
        const token =  Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({
            meta: {
                "wt-authorize-execution": "1"
            }
        });

        return run(
            {
                headers: {}
            },
            error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            }
        )
    });

    it ('shoud throw error if token is not a real JWT token', done => {
        const token =  Crypto.randomBytes(32).toString('hex');
        const run = createMockRunner({
            meta: {
                "wt-authorize-execution": "1"
                //'iss': 'https://test.run.webtask.io/self-hosted-issuer/',
                //'aud': 'https://test.auth0-extend.com/'
            }
        });

        return run(
            {
                headers: {
                    authorization: `Bearer ${token}`
                }
            },
            error => {
                Assert.ok(error);
                Assert.equal(error.statusCode, 401);

                return done();
            }
        )
    });

});

function createMockRunner(webtaskContext) {
    if (!webtaskContext) webtaskContext = {};

    const jwtMiddlewareFn = JwtMiddleware();

    return function run(requestOptions, next) {

        const defaultWebtaskContext = {
            headers: requestOptions.headers || {}
        };

        const dispatchFn = (req, res) => {
            req.webtaskContext = Hoek.applyToDefaults(
                defaultWebtaskContext,
                webtaskContext
            );

            return jwtMiddlewareFn(req, res, next);
        };

        const defaultRequestOptions = { url: '/'};

        return Shot.inject(
            dispatchFn,
            Hoek.applyToDefaults(defaultRequestOptions, requestOptions),
            res => Assert.fail(res, null, 'Unexpected response')
        );
    }
}

if (require.main === module){
    Lab.report([lab], { output: process.stdout, progress: 2});
}