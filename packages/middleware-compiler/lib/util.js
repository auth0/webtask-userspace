'use strict';

const MIDDLEWARE_SPEC_RX = /^(@[^/(]+\/[^/(]+|[^@/(]+)(?:\/([^/(]+))?$/;
const URL_MIDDLEWARE_MAX_REDIRECTS = 5;
const URL_MIDDLEWARE_RX = /^https?:\/\//;
const URL_MIDDLEWARE_TIMEOUT = 2000;

let Wreck;

module.exports = {
    parseMiddlewareSpecString,
    resolveMiddlewareFunction,
    validateMiddlewareFunction,
};

/**
 * Parse a middleware specification into a standard object
 *
 * @param {string} spec Middleware function specification
 * @returns {object}
 */
function parseMiddlewareSpecString(spec) {
    const matches = spec.match(MIDDLEWARE_SPEC_RX);

    if (!matches) {
        throw new Error(`Failed to parse middleware spec: ${spec}`);
    }

    const moduleName = matches[1];
    const exportName = matches[2];

    return { moduleName, exportName };
}

/**
 * Resolve a middleware specification into a middleware function
 *
 * @param {string|function} spec The middleware specification or an existing middlware
 * @param {object} options Options
 * @returns {function}
 */
function resolveMiddlewareFunction(spec, options, cb) {
    const debuglog = options.debuglog;
    const nodejsCompiler = options.nodejsCompiler;

    // Already a function, no resolution to do.
    if (typeof spec !== 'string') {
        return process.nextTick(cb, new Error('Unexpected spec type'));
    }

    if (URL_MIDDLEWARE_RX.test(spec)) {
        return resolveUrlMiddlewareFunction(
            spec,
            { debuglog, nodejsCompiler },
            cb
        );
    }

    return resolveNpmMiddlewareFunction(spec, { debuglog }, cb);
}
/**
 * Resolve an npm-based middleware specification into a middleware function
 *
 * @param {string} spec NPM middleware spec
 * @param {object} options Options
 * @param {function} cb Callback
 */
function resolveNpmMiddlewareFunction(spec, options, cb) {
    const debuglog = options.debuglog;

    debuglog('resolving an npm module middleware "%s"'.spec);

    try {
        const parsedSpec = parseMiddlewareSpecString(spec);
        const module = require(parsedSpec.moduleName);
        const middlewareFn = parsedSpec.exportName
            ? module[parsedSpec.exportName]()
            : module();

        return process.nextTick(
            cb,
            null,
            validateMiddlewareFunction(middlewareFn)
        );
    } catch (error) {
        return process.nextTick(cb, error);
    }
}

/**
 * Resolve a url-based middleware specification into a middleware function
 *
 * @param {string} url Url of the middleware code
 * @param {object} options Options
 * @param {function} cb Callback
 */
function resolveUrlMiddlewareFunction(url, options, cb) {
    const debuglog = options.debuglog;
    const nodejsCompiler = options.nodejsCompiler;

    if (!Wreck) Wreck = require('wreck');

    const wreckOptions = {
        redirects: URL_MIDDLEWARE_MAX_REDIRECTS,
        timeout: URL_MIDDLEWARE_TIMEOUT,
    };

    return Wreck.get(url, wreckOptions, (error, response, payload) => {
        if (error) {
            debuglog(
                'Error fetching middleware from "%s": $s',
                url,
                error.message
            );

            return cb(error);
        }

        const middlewareCode = payload.toString('utf-8');

        return nodejsCompiler(middlewareCode, (error, middlewareFactoryFn) => {
            if (error) {
                debuglog('Error compiling webtask code: %s', error.stack);

                return cb(error);
            }

            let middlewareFn;

            try {
                middlewareFn = middlewareFactoryFn();
            } catch (e) {
                debuglog(
                    'The middleware factory function exported by the code at "%s" generated an uncaught exception when invoked: %s',
                    url,
                    e.message
                );

                return cb(e);
            }

            try {
                validateMiddlewareFunction(middlewareFn);
            } catch (e) {
                debuglog(
                    'The code at "%s", when compiled, exported an invalid middlware function: %s',
                    url,
                    e.message
                );

                return cb(e);
            }

            return cb(null, middlewareFn);
        });
    });
}

/**
 * Validate a middleware function
 *
 * @param {function} middlewareFn A middleware function to be validated
 */
function validateMiddlewareFunction(middlewareFn) {
    if (typeof middlewareFn !== 'function' || middlewareFn.length !== 3) {
        throw new Error(
            'A Webtask middleware must export a function that returns a function with the signature `function(req, res, next)`'
        );
    }

    return middlewareFn;
}
