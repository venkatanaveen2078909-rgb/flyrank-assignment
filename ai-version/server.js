import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const app = express();
const PORT = process.env.PORT || 8001;
app.use(express.json());

const DB_PATH = path.resolve('ai-version/report.db');
const REPORTS_DIR = path.resolve('ai-version/reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    product TEXT,
    amount REAL,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT,
    created_at TEXT
  );
`);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// GET report metadata
app.get('/reports/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.id, file: `/reports/${row.id}/file`, created_at: row.created_at });
});

// GET report file
app.get('/reports/:id/file', (req, res) => {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.resolve(row.path));
});

// POST generate report with once-per-day idempotency
app.post('/reports', async (req, res) => {
  const force = req.body && req.body.force;
  
  if (!force) {
    const existing = db.prepare(`
      SELECT * FROM reports 
      WHERE date(created_at) = date('now') 
      ORDER BY id DESC LIMIT 1
    `).get();
    if (existing) {
      return res.status(200).json({ id: existing.id, file: `/reports/${existing.id}/file` });
    }
  }

  // Aggregations
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const totalRevenue = db.prepare('SELECT SUM(amount) as sum FROM orders').get().sum || 0;
  const topProducts = db.prepare(`
    SELECT product, SUM(amount) as revenue 
    FROM orders 
    GROUP BY product 
    ORDER BY revenue DESC 
    LIMIT 5
  `).all();
  const dailyOrders = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count 
    FROM orders 
    WHERE created_at >= date('now', '-7 days') 
    GROUP BY date(created_at)
  `).all();
  const allOrders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();

  // HTML template
  const html = `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          tr { break-inside: avoid; }
        </style>
      </head>
      <body>
        <h1>Store Report - ${new Date().toLocaleDateString()}</h1>
        <p>Total Orders: ${totalOrders} | Total Revenue: $${Number(totalRevenue).toFixed(2)}</p>
        
        <h2>Top 5 Products</h2>
        <table>
          <thead><tr><th>Product</th><th>Revenue</th></tr></thead>
          <tbody>
            ${topProducts.map(p => `<tr><td>${p.product}</td><td>$${Number(p.revenue).toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>Daily Orders</h2>
        <table>
          <thead><tr><th>Date</th><th>Orders</th></tr></thead>
          <tbody>
            ${dailyOrders.map(d => `<tr><td>${d.day}</td><td>${d.count}</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>All Orders</h2>
        <table>
          <thead><tr><th>ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>
            ${allOrders.map(o => `<tr><td>${o.id}</td><td>${o.customer}</td><td>${o.product}</td><td>$${Number(o.amount).toFixed(2)}</td><td>${o.created_at}</td></tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const now = new Date().toISOString();
  const insert = db.prepare('INSERT INTO reports (path, created_at) VALUES (?, ?)');
  const info = insert.run('', now);
  const id = Number(info.lastInsertRowid);
  const pdfPath = path.join(REPORTS_DIR, `${id}.pdf`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: pdfPath, format: 'A4' });
  await browser.close();

  db.prepare('UPDATE reports SET path = ? WHERE id = ?').run(pdfPath, id);
  res.status(201).json({ id, file: `/reports/${id}/file` });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`AI version listening on port ${PORT}`));
}
