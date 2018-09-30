# Async function middleware

The async function middleware provides a custom programming model which allows a webtask to directly return results in an idiomatic way.

## Usage

To use the async function middleware, you must create a webtask that exports an async function that returns a result:

```javascript
module.exports = async function (context) {
  return { hello: context.query.name || 'Anonymous' };
}
```

1. Set the `wt-node-dependencies` metadata property to a stringified JSON of an object having `@webtask/middleware-compiler` and `@webtask/async-function-middleware` properties whose values are the latest version of the [@webtask/middleware-compiler](../middleware-compiler) module and this module, respectively. For example:

    ```json
    {
      "@webtask/middleware-compiler": "1.5.0",
      "@webtask/async-function-middleware": "1.0.0"
    }
    ```

2. Set the `wt-compiler` metadata property on your webtask to `@webtask/middleware-compiler`.

3. Set (or add to) the `wt-middleware` metadata property of your webtask to contain a comma-separated list containing `@webtask/async-function-middleware`.

4. Issue requests to your webtask
