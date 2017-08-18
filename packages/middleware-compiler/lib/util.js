'use strict';

const MIDDLEWARE_SPEC_RX = /^(@[^/(]+\/[^/(]+|[^@/(]+)(?:\/([^/(]+))?$/;

module.exports = {
    parseMiddlewareSpecString,
    resolveCompiler,
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
function resolveCompiler(spec) {
    // Already a function, no resolution to do.
    if (typeof spec === 'function') return spec;

    const parsedSpec = parseMiddlewareSpecString(spec);
    const module = require(parsedSpec.moduleName);
    const middlewareFn = parsedSpec.exportName
        ? module[parsedSpec.exportName]()
        : module();

    if (typeof middlewareFn !== 'function' || middlewareFn.length !== 3) {
        throw new Error('A Webtask middleware must export a function that returns a function with the signature `function(req, res, next)`');
    }

    return middlewareFn;
}
