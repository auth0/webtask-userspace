'use strict';

const Assert = require('assert');
const ExpressJwt = require('express-jwt');
const jws = require('jws');
const JwksRsa = require('jwks-rsa');

const WT_AUTH_EXEC = 'wt-authorize-execution';

module.exports = () => {

    Assert.ok(module.webtask.meta['iss'], 'The iss meta is required for the ExpressJwt');
    Assert.ok(module.webtask.meta['aud'], 'The aud meta is required for the ExpressJwt');

    const iss = module.webtask.meta['iss'];
    const aud = module.webtask.meta['aud'];

    return function(req, res, next) { 

        // if wt-authorize-execution is set to true (non-zero) then proceed with authn and authz

        if (module.webtask.meta[WT_AUTH_EXEC] && module.webtask.meta[WT_AUTH_EXEC] !== "0"){

            if (req.headers['authorization']) {

                const match = (req.headers['authorization'] || '')
                .trim()
                .match(/^bearer (.+)$/i);

                let jwt;

                try {
                    jwt = jws.decode(match[1]);
                } catch(e){
                    const error = new Error('Invalid authorization header');
                    error.statusCode = 401;
                    return next(error);
                }

                if (
                    jwt.payload.scope.indexOf("wt:admin") === -1 
                    && jwt.payload.scope.indexOf(`wt:owner:${req.x_wt.container}`) === -1
                    && jwt.payload.scope.indexOf(module.webtask.meta['wt-execution-scope']) === -1
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