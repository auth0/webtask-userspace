'use strict';

const ExpressJwt = require('express-jwt');
const JwksRsa = require('jwks-rsa');

const WT_AUTH_EXEC = 'wt-authorize-execution';
const WT_META_EXEC_SCOPE = 'wt-execution-scope';
const WT_META_ADMIN_SCOPE = 'wt:admin';
const WT_META_ISS = 'wt-execution-iss';
const WT_META_AUD = 'wt-execution-aud';

module.exports = function middlewareFactory() {
    let cachedMiddlewareInstance;

    return function(req, res, next) {
        if (!cachedMiddlewareInstance) {
            cachedMiddlewareInstance = createMiddleware(req);
        }

        return cachedMiddlewareInstance(req, res, next);
    };
};

function createMiddleware(req) {
    const iss = req.webtaskContext.meta[WT_META_ISS];
    const aud = req.webtaskContext.meta[WT_META_AUD];

    // setup JWT middleware

    const loadRsaKey = JwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${iss}`,
    });

    const middleware = ExpressJwt({
        algorithms: ['RS256'],
        audience: aud,
        credentialsRequired: true,
        issuer: iss,
        secret: loadRsaKey,
    });

    return function(req, res, next) {
        const ctx = req.webtaskContext;

        // if wt-authorize-execution is set to true (non-zero) then proceed with authn and authz

        if (ctx.meta[WT_AUTH_EXEC] && ctx.meta[WT_AUTH_EXEC] !== '0') {
            return middleware(req, res, error => {
                if (error) {
                    let e = new Error(error.name);
                    e.statusCode = error.status;
                    return next(e);
                } else {
                    // authorization
                    const scope = !Array.isArray(req.user.scope)
                        ? req.user.scope.split(' ')
                        : req.user.scope;
                    const meta_exec_not_found =
                        !ctx.meta[WT_META_EXEC_SCOPE] ||
                        scope.indexOf(ctx.meta[WT_META_EXEC_SCOPE]) === -1;

                    if (
                        scope.indexOf(WT_META_ADMIN_SCOPE) === -1 &&
                        scope.indexOf(`wt:owner:${req.x_wt.container}`) ===
                            -1 &&
                        meta_exec_not_found
                    ) {
                        const error = new Error('UnauthorizedError');
                        error.statusCode = 403;
                        return next(error);
                    } else {
                        return next();
                    }
                }
            });
        }

        // authn and authz not required
        return next();
    };
}
