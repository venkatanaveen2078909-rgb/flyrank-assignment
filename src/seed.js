import { initDb } from './db.js';

const PRODUCTS = [
  'Mechanical Keyboard',
  'Wireless Mouse',
  'USB-C Docking Station',
  'Noise-Cancelling Headphones',
  '4K Ultra-Wide Monitor',
  'Ergonomic Desk Chair'
];

const CUSTOMERS = [
  'Alice Johnson',
  'Bob Smith',
  'Charlie Brown',
  'Diana Prince',
  'Ethan Hunt',
  'Fiona Gallagher',
  'George Clark',
  'Hannah Abbott',
  'Ian Malcolm',
  'Julia Roberts'
];

export function seedOrders(count = 200) {
  const db = initDb();

  // Rule: Make the script start by deleting all rows so running it twice leaves exactly one clean copy
  db.exec('DELETE FROM orders;');
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name='orders';");
  } catch {
    // sqlite_sequence might not exist yet if table was empty
  }

  const insertStmt = db.prepare(`
    INSERT INTO orders (customer, product, amount, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const now = new Date();

  // Simple deterministic or pseudo-random generator with seed
  let seed = 42;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < count; i++) {
    const customer = CUSTOMERS[Math.floor(random() * CUSTOMERS.length)];
    const product = PRODUCTS[Math.floor(random() * PRODUCTS.length)];
    const amount = Number((random() * (200 - 5) + 5).toFixed(2));

    // Spread across the last 30 days
    const daysAgo = Math.floor(random() * 30);
    const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = orderDate.toISOString().slice(0, 19).replace('T', ' ');

    insertStmt.run(customer, product, amount, dateStr);
  }

  const result = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  console.log(`Seeded orders count: ${result.count}`);
  return result.count;
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedOrders();
}
