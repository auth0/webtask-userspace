# Optional compiler middleware

The optional compiler middleware enables advanced middleware usage such as implementing compilers as middleware or even composable compilers. [`@webtask/middleware-compiler`](../middleware-compiler) plays a fundamental role in enabling middleware functions and one of its core assumptions is that the underlying webtask script (located at `req.webtaskContext.compiler.script`) is a string. It would be convenient to be able to reassign the webtask script to a compiled `Function` object when implementing a compiler. Unfortunately, this breaks the assumption made by `@webtask/middleware-compiler` (or even other userspace middleware functions) that it is safe to call `nodejsCompiler` on `req.webtaskContext.compiler.script`. This middleware decorates the `nodejsCompiler` with optional compilation based on the type of the webtask script.

## Usage

1. Set the `wt-node-dependencies` metadata property to the stringified JSON of an object having `@webtask/middleware-compiler` and `@webtask/optional-compiler-middleware` properties whose values are the latest version of the [@webtask/middleware-compiler](../middleware-compiler) module and this module, respectively.

    ```json
    {
      "@webtask/middleware-compiler": "1.5.0",
      "@webtask/optional-compiler-middleware": "1.0.0"
    }
    ```

2. Set the `wt-compiler` metadata property on your webtask to `@webtask/middleware-compiler`.

3. Set (or add to) the `wt-middleware` metadata property of your webtask to contain a comma-separated list containing `@webtask/optional-compiler-middleware`.

4. Issue requests to your webtask
