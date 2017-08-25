'use strict';

const AUTH_SECRET_NAME = 'wt-auth-secret';

module.exports = createAuthenticationMiddleware;

function createAuthenticationMiddleware() {
    return function authMiddleware(req, res, next) {
        const ctx = req.webtaskContext;

        if (ctx.secrets && ctx.secrets[AUTH_SECRET_NAME]) {
            const match = (ctx.headers['authorization'] || '')
                .trim()
                .match(/^bearer (.+)$/i);

            if (match && match[1] === ctx.secrets[AUTH_SECRET_NAME]) {
                return next();
            }

            const error = new Error('Unauthenticated extensibility point');
            error.statusCode = 401;

            return next(error);
        }

        return next();
    };
}
