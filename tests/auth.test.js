const request = require('supertest');
const app = require('../app');
const sequelize = require('../config/database');
const User = require('../models/User');

async function loginAs(email, password) {
  const agent = request.agent(app);
  await agent
    .post('/users/login')
    .send(`email=${email}&password=${password}`)
    .expect(302)
    .expect('Location', '/dashboard');
  return agent;
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await User.create({ username: 'admin', email: 'admin@example.com', password: 'pass', role: 'admin' });
  await User.create({ username: 'eng', email: 'eng@example.com', password: 'pass', role: 'engineer' });
  await User.create({ username: 'acct', email: 'acct@example.com', password: 'pass', role: 'accountant' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Role based route access', () => {
  test('admin can access /admin/users', async () => {
    const agent = await loginAs('admin@example.com', 'pass');
    const res = await agent.get('/admin/users');
    expect(res.status).toBe(200);
  });

  test('accountant cannot access /admin/users', async () => {
    const agent = await loginAs('acct@example.com', 'pass');
    const res = await agent.get('/admin/users');
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/dashboard');
  });

  test('engineer allowed /engineering but denied /accounting', async () => {
    const agent = await loginAs('eng@example.com', 'pass');
    const ok = await agent.get('/engineering');
    expect(ok.status).toBe(200);
    const denied = await agent.get('/accounting');
    expect(denied.status).toBe(302);
    expect(denied.header.location).toBe('/dashboard');
  });

  test('accountant allowed /accounting but denied /engineering', async () => {
    const agent = await loginAs('acct@example.com', 'pass');
    const ok = await agent.get('/accounting');
    expect(ok.status).toBe(200);
    const denied = await agent.get('/engineering');
    expect(denied.status).toBe(302);
    expect(denied.header.location).toBe('/dashboard');
  });
});
