const mongoose = require('mongoose');

class OrderQueryError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.code = 'VALIDATION_ERROR';
  }
}

function parsePage(query, allowedStatuses) {
  const requestedLimit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    throw new OrderQueryError('limit must be an integer between 1 and 100');
  }
  if (query.status !== undefined && !allowedStatuses.includes(query.status)) {
    throw new OrderQueryError('status is not supported');
  }

  let cursor = null;
  if (query.cursor !== undefined) {
    try {
      const decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
      const createdAt = new Date(decoded.createdAt);
      if (typeof decoded.id !== 'string' || !mongoose.isValidObjectId(decoded.id)
        || Number.isNaN(createdAt.getTime())) throw new Error();
      cursor = { createdAt, id: new mongoose.Types.ObjectId(decoded.id) };
    } catch {
      throw new OrderQueryError('cursor is invalid');
    }
  }
  return { limit: requestedLimit, cursor, status: query.status };
}

function nextCursor(record) {
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt.toISOString(), id: record._id.toString() }))
    .toString('base64url');
}

function pageQuery(cursor) {
  if (!cursor) return {};
  return {
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ],
  };
}

module.exports = { nextCursor, pageQuery, parsePage };
