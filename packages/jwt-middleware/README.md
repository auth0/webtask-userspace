# JSON Web Token Middleware

This middleware allows to secure execution of a webtask using JWT tokens by validating issuer, audience, and scope claims.

## Usage

1. Set the `wt-node-dependencies` metadata property to the stringified JSON of an object with names of modules as the keys and values set to the latest version for the corresponding module.

```
{
    "@webtask/middleware-compiler": "1.3.0", 
    "express-jwt": "5.3.1",
    "jws": "3.1.4",
    "jwks-rsa": "1.2.1"
}
```

2. Set the `wt-compiler` metadata property on your webtask to `@webtask/middleware-compiler`.

3. Set the `wt-compiler` metadata property to `@webtask/jwt-middleware`.

4. Set the `wt-authorize-execution` metadata property to any value other than `0` to secure the webtask.  Value of `0` or missing `wt-authorize-execution` metadata property will result with the webtask execution being unsecure.

5. Set the `iss` metadata property to the value of `authorization_server` property obtained from the discovery endpoint of your deployment (located at `{deployment_url}//api/description`).

6. Set the `aud` metadata property to the value of `audience` property obtained from the discovery endpoint of your deployment (located at `{deployment_url}//api/description`).

7. *Optionally*, set the `wt-execution-scope` metadata property to the name of a custom scope that can be used for authorization of webtask execution.

8. *Optionally*, set the `wt-debug` metadata property to a comma-separated list of debug references that contains `wt-middleware`. This will result in additional debug information being sent to real-time logs.

