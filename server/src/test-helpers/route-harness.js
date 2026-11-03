const express = require('express');

function createRouteClient(router) {
  const app = express();
  app.use('/api', router);
  app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  });

  return {
    request(path, options = {}) {
      return new Promise((resolve) => {
        const headers = Object.fromEntries(
          Object.entries(options.headers || {}).map(([name, value]) => [name.toLowerCase(), value]),
        );
        if (options.body !== undefined) headers['content-type'] = 'application/json';

        const req = Object.assign(Object.create(express.request), {
          app,
          method: options.method || 'GET',
          url: `/api${path}`,
          originalUrl: `/api${path}`,
          headers,
          body: options.body,
          cookies: options.cookies || {},
          params: {},
        });
        const responseHeaders = new Map();
        let body = '';
        const res = Object.assign(Object.create(express.response), {
          app,
          req,
          locals: {},
          statusCode: 200,
          setHeader(name, value) {
            responseHeaders.set(name.toLowerCase(), value);
          },
          getHeader(name) {
            return responseHeaders.get(name.toLowerCase());
          },
          removeHeader(name) {
            responseHeaders.delete(name.toLowerCase());
          },
          end(chunk) {
            if (chunk !== undefined)
              body += Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
            this._header = true;
            resolve({
              status: this.statusCode,
              headers: { get: (name) => responseHeaders.get(name.toLowerCase()) || null },
              json: async () => (body ? JSON.parse(body) : null),
              text: body,
            });
          },
        });
        req.res = res;

        app.handle(req, res, (error) => {
          if (error) {
            res
              .status(error.status || 500)
              .json({ error: { code: error.code || 'INTERNAL_SERVER_ERROR' } });
          } else if (!res.headersSent) {
            res.status(404).json({ error: { code: 'NOT_FOUND' } });
          }
        });
      });
    },
    close() {},
  };
}

function authenticatedAs(user = { id: 'customer-1' }) {
  return (req, res, next) => {
    req.authUser = user;
    next();
  };
}

module.exports = { authenticatedAs, createRouteClient };
