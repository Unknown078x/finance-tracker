process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');

async function registerAndLogin(email) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User', email, password: 'password123',
  });
  return { token: res.body.token, userId: res.body.user.id };
}

async function firstCategory(token, type) {
  const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`);
  return res.body.categories.find((c) => c.type === type);
}

describe('Transactions', () => {
  test('creates a transaction and reflects it in the list', async () => {
    const { token } = await registerAndLogin('tx1@example.com');
    const category = await firstCategory(token, 'expense');

    const create = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ category_id: category.id, type: 'expense', amount: 42.5, note: 'Groceries run', occurred_on: '2026-07-01' });

    expect(create.status).toBe(201);
    expect(create.body.transaction.amount).toBe(42.5);

    const list = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
  });

  test('rejects a transaction with a negative amount', async () => {
    const { token } = await registerAndLogin('tx2@example.com');
    const category = await firstCategory(token, 'expense');

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ category_id: category.id, type: 'expense', amount: -10, occurred_on: '2026-07-01' });

    expect(res.status).toBe(422);
    expect(res.body.fields.amount).toBeDefined();
  });

  test('rejects mismatched category type', async () => {
    const { token } = await registerAndLogin('tx3@example.com');
    const incomeCategory = await firstCategory(token, 'income');

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ category_id: incomeCategory.id, type: 'expense', amount: 10, occurred_on: '2026-07-01' });

    expect(res.status).toBe(422);
  });

  test('updates and deletes a transaction', async () => {
    const { token } = await registerAndLogin('tx4@example.com');
    const category = await firstCategory(token, 'income');

    const create = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ category_id: category.id, type: 'income', amount: 1000, occurred_on: '2026-07-01' });
    const id = create.body.transaction.id;

    const update = await request(app)
      .put(`/api/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category_id: category.id, type: 'income', amount: 1200, occurred_on: '2026-07-02' });
    expect(update.status).toBe(200);
    expect(update.body.transaction.amount).toBe(1200);

    const del = await request(app).delete(`/api/transactions/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  test('one user cannot see another user\'s transactions', async () => {
    const a = await registerAndLogin('userA@example.com');
    const b = await registerAndLogin('userB@example.com');
    const categoryA = await firstCategory(a.token, 'expense');

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ category_id: categoryA.id, type: 'expense', amount: 20, occurred_on: '2026-07-01' });

    const listB = await request(app).get('/api/transactions').set('Authorization', `Bearer ${b.token}`);
    expect(listB.body.total).toBe(0);
  });
});
