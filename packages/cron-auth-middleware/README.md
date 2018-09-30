# Cron auth middleware

The cron auth middleware provides a simple cron authentication mechanism so that the Webtask cron daemon is able to make authenticated requests but third parties cannot.

## Usage

To use the cron auth middleware leverages the fact that the Webtask cron daemon will invoke cron webtasks with an `Authentication` header having a bearer token corresponding to the underlying webtask token of that cron job.

1. Set the `wt-node-dependencies` metadata property to the stringified JSON of an object having `@webtask/middleware-compiler` and `@webtask/cron-auth-middleware` properties whose values are the latest version of the [@webtask/middleware-compiler](../middleware-compiler) module and this module, respectively.

    ```json
    {"@webtask/middleware-compiler":"1.1.0","@webtask/cron-auth-middleware":"1.1.0"}
    ```

2. Set the `wt-compiler` metadata property on your webtask to `@webtask/middleware-compiler`.

3. Set (or add to) the `wt-middleware` metadata property of your webtask to contain a comma-separated list containing `@webtask/cron-auth-middleware`.

4. Schedule the webtask to run periodically and note that requests lacking an appropriate `Authorization` header will fail with a `401` response.
