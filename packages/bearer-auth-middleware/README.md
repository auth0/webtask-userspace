# Bearer auth middleware

The bearer auth middleware is a generic bearer token authentication solution for webtasks. A request to a webtask configured with this middleware will be rejected with a `401` response if it lacks the correct bearer token.

## Usage

To use the bearer auth middleware requires encoding a shared secret in the `wt-auth-secret` [secret](https://webtask.io/docs/issue_parameters) that must be specified in `Authentication: Bearer <SHARED_SECRET>` headers.

1. Set the `wt-node-dependencies` metadata property to the stringified JSON of an object having `@webtask/middleware-compiler` and `@webtask/bearer-auth-middleware` properties whose values are the latest version of the [@webtask/middleware-compiler](../middleware-compiler) module and this module, respectively.

    ```json
    {"@webtask/middleware-compiler":"1.1.0","@webtask/bearer-auth-middleware":"1.1.0"}
    ```

2. Set the `wt-compiler` metadata property on your webtask to `@webtask/middleware-compiler`.

3. Set (or add to) the `wt-middleware` metadata property of your webtask to contain a comma-separated list containing `@webtask/bearer-auth-middleware`.

4. Set the `wt-auth-secret` secret to a shared secret.

5. Issue requests to your webtask, making sure that you add an `Authorization` header having the value: `Bearer <SHARED_SECRET>`.
