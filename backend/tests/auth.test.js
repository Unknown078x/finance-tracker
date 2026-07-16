process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');

describe('Auth', () => {
  const user = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'correct-horse' };

  test('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
  });

  test('rejects duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send({ ...user, email: 'dup@example.com' });
    const res = await request(app).post('/api/auth/register').send({ ...user, email: 'dup@example.com' });
    expect(res.status).toBe(409);
  });

  test('rejects registration with a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...user, email: 'short@example.com', password: '123' });
    expect(res.status).toBe(422);
    expect(res.body.fields.password).toBeDefined();
  });

  test('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send({ ...user, email: 'login@example.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects login with wrong password', async () => {
    await request(app).post('/api/auth/register').send({ ...user, email: 'wrong@example.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'wrong@example.com', password: 'nope-nope-nope' });
    expect(res.status).toBe(401);
  });

  test('rejects unauthenticated access to /me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
