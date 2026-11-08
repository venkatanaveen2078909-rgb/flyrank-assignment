import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb, DB_PATH } from './db.js';
import { getReportData } from './report-data.js';
import { renderReportPdf } from './renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '../reports');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

const db = initDb(DB_PATH);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Control panel: list all reports
app.get('/reports', (req, res) => {
  const reports = db.prepare('SELECT id, path, created_at FROM reports ORDER BY id DESC').all();
  res.json(reports.map(r => ({
    id: r.id,
    path: r.path,
    created_at: r.created_at,
    file: `/reports/${r.id}/file`
  })));
});

// GET /reports/:id -> report record with file link
app.get('/reports/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const row = db.prepare('SELECT id, path, created_at FROM reports WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.json({
    id: row.id,
    path: row.path,
    created_at: row.created_at,
    file: `/reports/${row.id}/file`
  });
});

// GET /reports/:id/file -> serves the PDF file from disk
app.get('/reports/:id/file', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const row = db.prepare('SELECT id, path FROM reports WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const absolutePath = path.resolve(row.path);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Report file missing on disk' });
  }

  res.sendFile(absolutePath);
});

// POST /reports -> runs whole pipeline: query -> render -> store -> return 201
app.post('/reports', async (req, res) => {
  try {
    const reportData = getReportData(db);

    // Insert new report record to obtain ID
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const placeholderPath = '';
    const insertStmt = db.prepare('INSERT INTO reports (path, created_at) VALUES (?, ?)');
    const result = insertStmt.run(placeholderPath, now);
    const reportId = Number(result.lastInsertRowid);

    const fileName = `${reportId}.pdf`;
    const outputPath = path.join(REPORTS_DIR, fileName);

    // Render HTML to PDF with Playwright
    await renderReportPdf(reportData, outputPath);

    // Store relative path in database
    const relativePath = path.join('reports', fileName);
    db.prepare('UPDATE reports SET path = ? WHERE id = ?').run(relativePath, reportId);

    return res.status(201).json({
      id: reportId,
      file: `/reports/${reportId}/file`
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export default app;
