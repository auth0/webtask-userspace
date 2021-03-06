'use strict';

const Debuglog = require('./lib/debuglog');
const Middleware = require('./lib/middleware');
const Util = require('./lib/util');

const META_PROP_MIDDLEWARE = 'wt-middleware';

module.exports = middlewareCompiler;

function middlewareCompiler(options, cb) {
    const debuglog = Debuglog.create(META_PROP_MIDDLEWARE, options.meta);
    const nodejsCompiler = options.nodejsCompiler;
    const script = options.script;
    const middlewareString = options.meta[META_PROP_MIDDLEWARE] || '';
    const middlewareSpecs = [];

    if (middlewareString) {
        let jsonSpecs;
        try {
            jsonSpecs = JSON.parse(middlewareString);
        } catch (__) {
            // Ignore error
        }

        if (jsonSpecs) {
            // The `wt-middleware` metadata is valid JSON
            if (!Array.isArray(jsonSpecs)) {
                const error = new Error(
                    'Unexpected JSON wt-middleware metadata that does not represent an array'
                );

                debuglog(error.message);

                return cb(error);
            }

            middlewareSpecs.push.apply(middlewareSpecs, jsonSpecs);
        } else {
            const csv = middlewareString.split(',').filter(Boolean);

            // Not JSON; fallback to CSV
            middlewareSpecs.push.apply(middlewareSpecs, csv);
        }
    }

    return cb(null, function middlewarePipeline(ctx, req, res) {
        const defaultMiddleware = Middleware.createDefaultMiddleware({
            debuglog,
            respondWithError,
        });

        // Add a final middleware that will invoke the webtaskFunction
        // if not yet invoked.
        middlewareSpecs.push(defaultMiddleware);

        // Inject a new context object that can be used by middleware
        // to do their own compilation.
        ctx.compiler = { nodejsCompiler, script };

        // Attach the webtask context to the request at a well-known location
        req.webtaskContext = ctx;

        let nextMiddlewareIdx = 0;

        return invokeNextMiddleware();

        function invokeNextMiddleware(error) {
            if (error) {
                debuglog(
                    'Error produced by middleware: %s',
                    error.stack || error
                );

                return respondWithError(error, res);
            }

            const middlewareSpec = middlewareSpecs[nextMiddlewareIdx];
            const middlewareIdx = nextMiddlewareIdx++;
            const invokeMiddlewareFn = middlewareFn => {
                debuglog(
                    'Invoking middleware %d: %s',
                    middlewareIdx,
                    middlewareSpec.name || middlewareSpec
                );

                try {
                    return middlewareFn(req, res, invokeNextMiddleware);
                } catch (e) {
                    debuglog(
                        'Synchronous error running middleware "%s": %s',
                        middlewareSpec,
                        e.stack || e
                    );

                    return respondWithError(e, res);
                }
            };

            // The middleware is either automatic (default) or has been cached so we can immediately run it
            if (typeof middlewareSpec === 'function') {
                return invokeMiddlewareFn(middlewareSpec);
            }

            return Util.resolveMiddlewareFunction(
                middlewareSpec,
                { debuglog, nodejsCompiler },
                (error, middlewareFn) => {
                    if (error) {
                        return respondWithError(error, res);
                    }

                    // Cache the resulting middleware for the next invocation.
                    // Util.resolveMiddlewareFunction operates as an identify function for function arguments.
                    middlewareSpecs[middlewareIdx] = middlewareFn;

                    return invokeMiddlewareFn(middlewareFn);
                }
            );
        }

        function respondWithError(error, res) {
            if (!(error instanceof Error)) {
                error = new Error(
                    error.message || String(error) || 'Unknown error'
                );
            }

            if (!error.statusCode) {
                error.statusCode = 500;
            }

            const statusCode = error.statusCode;
            const headers = {
                'Content-Type': 'application/json',
            };
            const payload = {
                message: error.message,
                statusCode: error.statusCode,
            };

            if (error.statusCode === 500) {
                debuglog(
                    'Responding with generic 500 error after: %s',
                    error.stack || error.message || error
                );

                // Avoid leaking sensitive information. To debug, users
                // are directed to real-time logs.
                payload.message = 'Server error';
            } else {
                [
                    'code',
                    'errno',
                    'error',
                    'error_description',
                    'data',
                ].forEach(key => {
                    if (error[key]) payload[key] = error[key];
                });
            }

            let json;

            try {
                json = JSON.stringify(payload);
            } catch (e) {
                const error = new Error(
                    'Error serializing error: ' + e.message
                );
                error.statusCode = 500;

                return respondWithError(error, res);
            }

            res.writeHead(statusCode, headers);
            res.end(json);
        }
    });
}
