import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.resolve('ai-version/report.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    product TEXT,
    amount REAL,
    created_at TEXT
  );
  DELETE FROM orders;
`);

const products = ['Keyboard', 'Mouse', 'Monitor', 'Desk', 'Chair'];
const customers = ['Alice', 'Bob', 'Charlie', 'David', 'Emma'];

const insert = db.prepare('INSERT INTO orders (customer, product, amount, created_at) VALUES (?, ?, ?, ?)');

for (let i = 0; i < 200; i++) {
  const customer = customers[Math.floor(Math.random() * customers.length)];
  const product = products[Math.floor(Math.random() * products.length)];
  const amount = parseFloat((Math.random() * 195 + 5).toFixed(2));
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  insert.run(customer, product, amount, date);
}

const count = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
console.log(`Seeded ${count} orders in ai-version/report.db`);
