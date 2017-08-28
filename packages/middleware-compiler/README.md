# Middleware compiler

The middleware compiler provides a mechanism to run any number of middleware prior to invoking a webtask.

Webtask middleware are disigned in a [connect](https://github.com/senchalabs/connect)-compatible way that should allow many [express middleware](https://expressjs.com/en/resources/middleware.html) to *just work*.



## Usage:

1. Set the `wt-node-dependencies` metadata property to the stringified JSON of an object having a `@webtask/middleware-compiler` property whose value is the latest version of this module.

    ```json
    {"@webtask/middleware-compiler":"1.1.0"}
    ```

2. Set the `wt-compiler` metadata property on your webtask to `@webtask/middleware-compiler`.

3. *Optionally*, set the `wt-middleware` metadata property to a comma-separated list of middleware references. These references can be the name of an npm module, in which case the module's default export is used. These can also be references like `module_name/name_of_export_function`, which would be equivalent to `require('module_name').name_of_export_function`. These middleware will be invoked sequentially and the next middleware will only be invoked if the previous middleware calls `next()` without argument.

3. *Optionally*, set the `wt-debug` metadata property to a comma-separated list of debug references that contains `wt-middleware`. This will result in additional debug information being sent to real-time logs.



## How it works

A middleware is a `Function` exported by a node module that **returns** another `Function` having the signature `function(req, res, next)`, where:

- `req` is the instance of `http.IncomingRequest` for the current request. It has a `req.webtaskContext` property:
    - `req.webtaskContext` is a typical [webtask context object](https://webtask.io/docs/context) that is augmented with a `compiler` property. The `compiler` object is exposed so that a middleware can be implemented that supports [custom programming models](https://webtask.io/docs/webtask-compilers). The `compiler` property is an object that has `nodejsCompiler` and `script` properties where:
        - `nodejsCompiler` is the node.js [compiler function provided to webtask compilers](https://webtask.io/docs/webtask-compilers)
        - `script` is the underling webtask's code

- `res` is the instance of `http.ServerResponse` for the current request
- `next` is a function with the signature `function next(error)`. A middleware function may be designed to complete the response, in which case it can omit calling `next`. A middleware may also implement authentication logic, such as the [authentication]() middleware. In this case, the middleware might invoke `next` with an `Error`. If the error has a `statusCode` property, this will be used as the response status code. Otherwise, to allow control to go to the next middleware, or to the default middleware (which compiles and invokes the webtask code), the middleware can call `next()` with no arguments.



## Example middleware

** Authentication **

- [`@webtask/bearer-auth-middleware`](../bearer-auth-middleware)
- [`@webtask/cron-auth-middleware`](../cron-auth-middleware)
