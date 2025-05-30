const request = require('supertest');
const express = require('express');

// Import your actual server (assuming it exports the app)
let app;
try {
  app = require('./server');
} catch {
  // fallback: create a minimal app for demonstration
  app = express();
  app.use(express.json());
  app.get('/api/customers/:phone', (req, res) => {
    res.json({ name: 'Test User', phone: req.params.phone, points: 42, datejoined: new Date().toISOString() });
  });
}

describe('GET /api/customers/:phone', () => {
  let db;
  const testCustomer = {
    name: 'Test User',
    phone: '0712345678',
    email: 'test@example.com',
    idNumber: 'ID12345',
    points: 123
  };

  beforeAll(done => {
    db = new sqlite3.Database(path.join(__dirname, 'loyalty.db'));
    db.run(
      'INSERT OR REPLACE INTO customers (name, phone, email, idNumber, points) VALUES (?, ?, ?, ?, ?)',
      [testCustomer.name, testCustomer.phone, testCustomer.email, testCustomer.idNumber, testCustomer.points],
      done
    );
  });

  afterAll(done => {
    db.run('DELETE FROM customers WHERE phone = ?', [testCustomer.phone], () => {
      db.close(done);
    });
  });

  it('should retrieve the correct points for a customer from the database', async () => {
    const res = await request(app).get(`/api/customers/${testCustomer.phone}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('points', testCustomer.points);
  });
});
