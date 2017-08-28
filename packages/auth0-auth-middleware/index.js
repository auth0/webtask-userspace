'use strict';

const Assert = require('assert');
const ExpressJwt = require('express-jwt');
const Url = require('url');

const SUPPORTED_ALGORITHMS = ['HS256', 'RS256'];

module.exports = createAuth0Middleware;

function createAuth0Middleware() {
    let cachedJwtMiddleware;

    return function auth0Middleware(req, res, next) {
        if (!cachedJwtMiddleware) {
            const ctx = req.webtaskContext;

            Assert.ok(
                ctx.secrets.AUTH0_AUDIENCE,
                'The AUTHO_AUDIENCE secret is required'
            );

            const algOptions = getAgorithmSpecificOptions(ctx);
            const jwtMiddlewareOptions = Object.assign(
                {
                    audience: ctx.secrets.AUTH0_AUDIENCE,
                    issuer: getIssuerUri(ctx),
                },
                algOptions
            );

            cachedJwtMiddleware = ExpressJwt(jwtMiddlewareOptions);
        }

        return cachedJwtMiddleware(req, res, error => {
            if (error) {
                // Ensure compatibility with Webtask middleware and Webtask error response handler
                error.statusCode = error.status;

                return next(error);
            }

            return next();
        });
    };
}

function getAgorithmSpecificOptions(ctx) {
    Assert.ok(
        !ctx.secrets.AUTH0_ALGORITHM ||
            SUPPORTED_ALGORITHMS.indexOf(ctx.secrets.AUTH0_ALGORITHM) !== -1,
        `If specified, the AUTH0_ALGORITHM secret must indicate one of the supported algoriths: ${SUPPORTED_ALGORITHMS.join(
            ', '
        )}`
    );

    const alg = ctx.secrets.AUTH0_ALGORITHM || 'RS256';

    if (alg === 'HS256') {
        Assert.ok(
            ctx.secrets.AUTH0_API_SECRET,
            'The AUTH0_API_SECRET secret is required when using HS256'
        );

        return {
            secret: ctx.secrets.AUTH0_API_SECRET,
            algorithms: [alg],
        };
    }

    const JwksRsa = require('jwks-rsa');

    return {
        secret: JwksRsa.expressJwtSecret({
            cache: !!ctx.secrets.AUTH0_JWKS_CACHE,
            rateLimit: !!ctx.secrets.AUTH0_JWKS_RATE_LIMIT,
            jwksRequestsPerMinute: +ctx.secrets.AUTH0_JWKS_RATE_LIMIT,
            jwksUri: getIssuerUri(ctx, '/.well-known/jwks.json'),
        }),
        algorithms: [alg],
    };
}

function getIssuerUri(ctx, pathname = '/') {
    Assert.ok(ctx.secrets.AUTH0_DOMAIN, 'The AUTHO_DOMAIN secret is required');

    const parsedUrl = Url.parse(ctx.secrets.AUTH0_DOMAIN);

    Assert.ok(
        !parsedUrl.protocol || parsedUrl.protocol === 'https:',
        'The AUTH0_DOMAIN must be an https uri'
    );

    return Url.format({
        host: parsedUrl.host,
        pathname,
        protocol: 'https:',
    });
}
