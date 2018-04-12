# JSON Web Token Middleware

This middleware allows you to secure execution of a webtask using JWT tokens by validating issuer, audience, and scope claims.

## Usage

1. Set the `wt-node-dependencies` metadata property to the stringified JSON of an object with names of modules as the keys and values set to the latest version for the corresponding module.

```
{
    "@webtask/middleware-compiler": "1.3.0", 
    "@webtask/jwt-middleware": "1.0.0"
}
```

2. Set the `wt-compiler` metadata property on your webtask to `@webtask/middleware-compiler`.

3. Set the `wt-middleware` metadata property to `@webtask/jwt-middleware`.

4. Set the `wt-authorize-execution` metadata property to any value other than `0` to require either the `wt:owner:<container>` or `wt:admin` or the custom scope encoded in the `wt-execution-scope` metadata property. You can disable any authorization checks for the execution of the webtask by setting `wt-authorize-execution` metadata property to `0` or not including it in your request.

5. Set the `wt-execution-iss` metadata property to the value of `authorization_server` property obtained from the discovery endpoint of your deployment (located at `{deployment_url}/api/description`).

6. Set the `wt-execution-aud` metadata property to the value of `audience` property obtained from the discovery endpoint of your deployment (located at `{deployment_url}/api/description`).

7. *Optionally*, set the `wt-execution-scope` metadata property to the name of a custom scope that can be used for authorization of webtask execution.

8. *Optionally*, set the `wt-debug` metadata property to a comma-separated list of debug references that contains `wt-middleware`. This will result in additional debug information being sent to real-time logs.

## Creating and securing a webtask using CLI

1. Determine which profile you will use when creating the webtask or create a new one by running `wt init`.  For more options please refer to https://webtask.io/docs/wt-cli or `wt init -h`.

2. Save your webtask code into a file f.e. `echo "module.exports = function (cb) { cb(null, 'Hello'); }" > hello.js`.

3. In the same folder create a file `meta` with all the metadata properties. Each property should be on its own line structured as `KEY=VALUE` pair.

```
wt-authorize-execution=1
wt-node-dependencies={"@webtask/middleware-compiler":"^1.3.0","@webtask/jwt-middleware":"^1.0.0"}
wt-compiler=@webtask/middleware-compiler
wt-middleware=@webtask/jwt-middleware
wt-execution-iss={ISSUER_URI}
wt-execution-aud={AUDIENCE_URI}
wt-execution-scope={EXECUTION_SCOPE}
```

4. Run the create command `wt create hello.js --meta-file meta -p {profile_name}`.