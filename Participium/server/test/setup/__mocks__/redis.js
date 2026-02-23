// server/test/setup/__mocks__/redis.js

const redisMock = {
  set: jest.fn(async () => 'OK'),
  get: jest.fn(async () => null),
  del: jest.fn(async () => 1),
  connect: jest.fn(async () => {}),
  on: jest.fn(),
};

module.exports = redisMock;
