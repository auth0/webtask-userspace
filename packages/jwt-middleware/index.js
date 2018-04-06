'use strict';

const Assert = require('assert');
const ExpressJwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const JwksRsa = require('jwks-rsa');

const WT_AUTH_EXEC = 'wt-authorize-execution';
const WT_META_EXEC_SCOPE ='wt-execution-scope';
const WT_META_ADMIN_SCOPE = 'wt:admin';
const WT_META_ISS = 'wt-execution-iss';
const WT_META_AUD ='wt-execution-aud';

const AUTHZ = 'authorization';
const BEARER = /^bearer\s+(.+)\s*$/i;

module.exports = function middlewareFactory(){
    let cachedMiddlewareInstance;

    return function(req, res, next) {
        if (!cachedMiddlewareInstance) {
            cachedMiddlewareInstance = createMiddleware(req);
        }

        return cachedMiddlewareInstance(req, res, next);
    }
}

function createMiddleware(req) {

    const iss = req.webtaskContext.meta[WT_META_ISS];
    const aud = req.webtaskContext.meta[WT_META_AUD]

    // setup JWT middleware

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

    return function(req, res, next) {

        const ctx = req.webtaskContext;

        // if wt-authorize-execution is set to true (non-zero) then proceed with authn and authz

        if (ctx.meta[WT_AUTH_EXEC] && ctx.meta[WT_AUTH_EXEC] !== "0"){

            if (req.headers[AUTHZ]) {

                // authentication

                try {

                    return middleware(req, res, error => {

                        if (error) {

                            let e = new Error(error.name);
                            e.statusCode = error.status;
                            return next(e);

                        } else {

                            // authorization

                            const match = (req.headers[AUTHZ] || '').trim().match(BEARER);

                            let jwt;

                            try {
                                jwt = jsonwebtoken.decode(match[1]);
                                if (!jwt) throw new Error();
                            } catch(e){
                                const error = new Error('UnauthorizedError');
                                error.statusCode = 401;
                                return next(error);
                            }

                            // verify claims
                            const scope = jwt.scope.split(' ');

                            if (
                                scope.indexOf(WT_META_ADMIN_SCOPE) === -1 
                                && scope.indexOf(`wt:owner:${req.x_wt.container}`) === -1
                                && scope.indexOf(ctx.meta[WT_META_EXEC_SCOPE]) === -1
                            ) {
                                const error = new Error('UnauthorizedError');
                                error.statusCode = 403;
                                return next(error);
                            } else {
                                return next();
                            }
                        }
                    });

                } catch(e){
                    const error = new Error('UnauthorizedError');
                    error.statusCode = 401;
                    return next(error);
                }

            } else {
                const error = new Error('UnauthorizedError');
                error.statusCode = 401;
                return next(error);
            }
        }

        // authn and authz not required
        return next();
    };
};