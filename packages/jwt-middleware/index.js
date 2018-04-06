'use strict';

const Assert = require('assert');
const ExpressJwt = require('express-jwt');
const jws = require('jws');
const JwksRsa = require('jwks-rsa');

const WT_AUTH_EXEC = 'wt-authorize-execution';

module.exports = () => {

    return function(req, res, next) {

        const ctx = req.webtaskContext;
    
        const iss = ctx.meta['iss'];
        const aud = ctx.meta['aud'];

        // if wt-authorize-execution is set to true (non-zero) then proceed with authn and authz

        if (ctx.meta[WT_AUTH_EXEC] && ctx.meta[WT_AUTH_EXEC] !== "0"){

            if (req.headers['authorization']) {

                const match = (req.headers['authorization'] || '')
                .trim()
                .match(/^bearer (.+)$/i);

                let jwt;

                try {
                    jwt = jws.decode(match[1]);
                    if (!jwt) throw new Error();
                } catch(e){
                    const error = new Error('Invalid authorization header');
                    error.statusCode = 401;
                    return next(error);
                }

                if (
                    jwt.payload.scope.indexOf("wt:admin") === -1 
                    && jwt.payload.scope.indexOf(`wt:owner:${req.x_wt.container}`) === -1
                    && jwt.payload.scope.indexOf(ctx.meta['wt-execution-scope']) === -1
                ) {
                    const error = new Error('Missing required scopes');
                    error.statusCode = 401;
                    return next(error);
                }

            } else {
                const error = new Error('Missing authorization header');
                error.statusCode = 401;
                return next(error);
            }

            // verify if token is correctly signed and has correct aud/iss fields
            try {

                const loadRsaKey = JwksRsa.expressJwtSecret({
                    cache: true,
                    rateLimit: true,
                    jwksRequestsPerMinute: 5,
                    jwksUri: `${iss}`
                });

                const middleware = ExpressJwt({
                    algorithms: ['RS256'],
                    audience: aud,
                    issuer: iss,
                    secret: loadRsaKey
                });

                return middleware(req, res, next);

            } catch(e){
                const error = new Error('Error validating token: ' + e);
                error.statusCode = 401;
                return next(error);
            }
        }

        // authn and authz not required
        return next();
    };
};