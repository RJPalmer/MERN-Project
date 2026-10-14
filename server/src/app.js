const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const env = require('./config/env');
const logger = require('./config/logger');
const { getMongoStatus } = require('./db/mongo');
const { getRedisStatus } = require('./db/redis');
const authRoutes = require('./modules/auth/auth.routes');
const vendorRoutes = require('./modules/vendors/vendor.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const storefrontRoutes = require('./modules/catalog/storefront.routes');
const cartRoutes = require('./modules/cart/cart.routes');
const checkoutRoutes = require('./modules/checkout/checkout.routes');
const addressRoutes = require('./modules/addresses/address.routes');
const customerOrderRoutes = require('./modules/orders/customer.routes');
const vendorOrderRoutes = require('./modules/orders/vendor.routes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/products', storefrontRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/me/addresses', addressRoutes);
app.use('/api/v1/me/orders', customerOrderRoutes);
app.use('/api/v1/vendors/:vendorId/orders', vendorOrderRoutes);

app.get('/api/v1/health', (req, res) => {
  const dependencies = {
    mongodb: getMongoStatus(),
    redis: getRedisStatus(),
  };
  const healthy = Object.values(dependencies).every((status) => status === 'connected');

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dependencies,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use((error, req, res, next) => {
  req.log.error({ err: error }, 'Unhandled request error');
  res.status(error.status || 500).json({
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
});

module.exports = app;
