# Webtask userspace components

This repository is a collection of userspace tools and libraries that augment the webtask runtime environment.

- (`middleware-compiler`)(./packages/middleware-compiler) provides a mechanism to run a series of middleware during a webtask request lifecycle. Middleware are designed to provide re-usable functionality to enable:
  - Custom authentication strategies (see: [bearer-auth-middleware](./packages/bearer-auth-middleware), and [cron-auth-middleware](./packages/cron-auth-middleware))
  - Custom programming models for end-user code
  - Support for custom programming languages or markup formats
  - Adaptors for existing node.js frameworks to work in the webtask runtime environment
  - Custom, per-request or per-webtask logging
