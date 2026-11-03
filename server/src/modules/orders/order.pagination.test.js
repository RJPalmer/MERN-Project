const test = require('node:test');
const assert = require('node:assert/strict');

const { nextCursor, pageQuery, parsePage } = require('./order.pagination');

const id = '507f1f77bcf86cd799439011';
const createdAt = new Date('2026-01-02T03:04:05.000Z');

test('page parsing applies defaults and accepts supported filters', () => {
  assert.deepEqual(parsePage({ status: 'paid', limit: '25' }, ['paid', 'cancelled']), {
    limit: 25,
    cursor: null,
    status: 'paid',
  });
});

test('page parsing rejects an unsupported limit and status', () => {
  assert.throws(() => parsePage({ limit: '101' }, []), { code: 'VALIDATION_ERROR', status: 400 });
  assert.throws(() => parsePage({ status: 'unknown' }, ['paid']), {
    code: 'VALIDATION_ERROR',
    status: 400,
  });
});

test('cursor encoding and parsing preserve the sort position', () => {
  const cursor = nextCursor({ createdAt, _id: { toString: () => id } });
  const parsed = parsePage({ cursor }, []);

  assert.equal(parsed.cursor.createdAt.toISOString(), createdAt.toISOString());
  assert.equal(parsed.cursor.id.toString(), id);
  assert.deepEqual(pageQuery(parsed.cursor), {
    $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: parsed.cursor.id } }],
  });
});

test('page parsing rejects a malformed cursor', () => {
  assert.throws(() => parsePage({ cursor: 'invalid' }, []), {
    code: 'VALIDATION_ERROR',
    status: 400,
  });
});
