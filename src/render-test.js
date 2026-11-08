import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { getReportData } from './report-data.js';
import { renderReportPdf } from './renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, '../reports/test.pdf');

console.log('Querying report data...');
const reportData = getReportData();

console.log(`Rendering PDF to ${outputPath}...`);
const start = Date.now();
await renderReportPdf(reportData, outputPath);
const duration = Date.now() - start;

console.log(`Rendered reports/test.pdf in ${duration}ms!`);
const stats = fs.statSync(outputPath);
console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
