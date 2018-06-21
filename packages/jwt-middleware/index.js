'use strict';

const Assert = require('assert');

const ExpressJwt = require('express-jwt');
const JwksRsa = require('jwks-rsa');
const Wreck = require('wreck');

const WT_ADMIN_SCOPE = 'wt:admin';
const WT_META_AUTH_EXEC = 'wt-authorize-execution';
const WT_META_EXEC_SCOPE = 'wt-execution-scope';
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
    let expressJwtMiddleware;
    const getExpressJwtMiddleware = cb => {
        if (expressJwtMiddleware) {
            return process.nextTick(cb, null, expressJwtMiddleware);
        }

        const iss = req.webtaskContext.meta[WT_META_ISS];
        const aud = req.webtaskContext.meta[WT_META_AUD];

        Assert.ok(
            iss,
            `the '${WT_META_ISS}' metadata property is required when '${WT_META_AUTH_EXEC}' is set`
        );
        Assert.ok(
            aud,
            `the '${WT_META_AUD}' metadata property is required when '${WT_META_AUTH_EXEC}' is set`
        );

        return Wreck.get(
            '.well-known/openid-configuration',
            {
                baseUrl: iss,
                json: true,
            },
            (error, res, payload) => {
                if (error) {
                    return cb(error);
                }

                if (typeof payload !== 'object' || !payload) {
                    const error = new Error(
                        'Unexpected response payload from oidc-discovery uri'
                    );
                    error.statusCode = 502;

                    return cb(error);
                }

                if (!payload.jwks_uri || typeof payload.jwks_uri !== 'string') {
                    const error = new Error(
                        'Missing jwks_uri property on oidc-discovery endpoint'
                    );
                    error.statusCode = 502;

                    return cb(error);
                }

                // setup JWT middleware

                const loadRsaKey = JwksRsa.expressJwtSecret({
                    cache: true,
                    rateLimit: true,
                    jwksRequestsPerMinute: 5,
                    jwksUri: payload.jwks_uri,
                });

                // Create (and cache) the resulting middleware for the duration of this
                // webtask instance.
                expressJwtMiddleware = ExpressJwt({
                    algorithms: ['RS256'],
                    audience: aud,
                    credentialsRequired: true,
                    issuer: iss,
                    secret: loadRsaKey,
                });

                return cb(null, expressJwtMiddleware);
            }
        );
    };

    return function(req, res, next) {
        const ctx = req.webtaskContext;

        // if wt-authorize-execution is set to true (non-zero) then proceed with authn and authz

        if (
            ctx.meta[WT_META_AUTH_EXEC] &&
            ctx.meta[WT_META_AUTH_EXEC] !== '0'
        ) {
            return getExpressJwtMiddleware((error, middleware) => {
                if (error) {
                    return next(error);
                }

                return middleware(req, res, error => {
                    if (error) {
                        let e = new Error(error.message);
                        e.name = error.name;
                        e.code = error.code;
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
                            scope.indexOf(WT_ADMIN_SCOPE) === -1 &&
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
            });
        }

        // authn and authz not required
        return next();
    };
}
