import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

export function buildHtmlTemplate(reportData) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  const numberFormatter = new Intl.NumberFormat('en-US');

  const topProductsHtml = reportData.topProducts.map((p, idx) => `
    <tr>
      <td class="text-center font-bold">${idx + 1}</td>
      <td class="font-medium">${escapeHtml(p.product)}</td>
      <td class="text-right">${numberFormatter.format(p.orderCount)}</td>
      <td class="text-right font-semibold text-emerald-700">${currencyFormatter.format(p.revenue)}</td>
    </tr>
  `).join('');

  const dailyOrdersHtml = (reportData.ordersPerDay || []).map(d => `
    <tr>
      <td>${d.date}</td>
      <td class="text-right">${numberFormatter.format(d.orderCount)}</td>
      <td class="text-right font-medium">${currencyFormatter.format(d.revenue)}</td>
    </tr>
  `).join('');

  const allOrdersHtml = (reportData.allOrders || []).map(o => `
    <tr>
      <td class="text-mono text-center">#${o.id}</td>
      <td>${escapeHtml(o.customer)}</td>
      <td>${escapeHtml(o.product)}</td>
      <td class="text-right font-medium">${currencyFormatter.format(o.amount)}</td>
      <td class="text-center text-sm text-gray-500">${o.createdAt}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Sales & Order Report</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 14mm 18mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.5;
      font-size: 13px;
    }

    .header-banner {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .header-title h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    .header-title p {
      color: #64748b;
      font-size: 13px;
    }

    .header-meta {
      text-align: right;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-date {
      margin-top: 6px;
      color: #475569;
      font-size: 12px;
      font-weight: 500;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px 20px;
      border-left: 4px solid #3b82f6;
    }

    .metric-card.accent {
      border-left-color: #10b981;
    }

    .metric-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 24px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 16px;
      background-color: #3b82f6;
      border-radius: 2px;
    }

    .side-by-side {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 600;
      text-align: left;
      padding: 9px 12px;
      border-bottom: 2px solid #cbd5e1;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; }
    .text-emerald-700 { color: #047857; }
    .text-gray-500 { color: #64748b; }

    .long-table-container {
      margin-top: 16px;
    }

    .report-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="header-title">
      <h1>Store Executive Report</h1>
      <p>Automated business sales and inventory aggregation summary</p>
    </div>
    <div class="header-meta">
      <span class="badge">Official Report</span>
      <div class="header-date">${today}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="metric-card">
      <div class="metric-label">Total Completed Orders</div>
      <div class="metric-value">${numberFormatter.format(reportData.totalOrders)}</div>
    </div>
    <div class="metric-card accent">
      <div class="metric-label">Total Gross Revenue</div>
      <div class="metric-value">${currencyFormatter.format(reportData.totalRevenue)}</div>
    </div>
  </div>

  <div class="side-by-side">
    <div>
      <h2 class="section-title">Top 5 Products by Revenue</h2>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 40px;">#</th>
            <th>Product</th>
            <th class="text-right">Units</th>
            <th class="text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${topProductsHtml}
        </tbody>
      </table>
    </div>

    <div>
      <h2 class="section-title">Daily Trend (Last 7 Days)</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th class="text-right">Orders</th>
            <th class="text-right">Daily Rev</th>
          </tr>
        </thead>
        <tbody>
          ${dailyOrdersHtml}
        </tbody>
      </table>
    </div>
  </div>

  <div class="long-table-container">
    <h2 class="section-title">Complete Orders Log (${reportData.allOrders ? reportData.allOrders.length : 0} Records)</h2>
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 60px;">Order ID</th>
          <th>Customer</th>
          <th>Product</th>
          <th class="text-right">Amount</th>
          <th class="text-center">Order Timestamp</th>
        </tr>
      </thead>
      <tbody>
        ${allOrdersHtml}
      </tbody>
    </table>
  </div>

  <div class="report-footer">
    <span>Generated by PDF Report Generator Engine</span>
    <span>Confidential & Internal Use Only</span>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function renderReportPdf(reportData, outputPath) {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const html = buildHtmlTemplate(reportData);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 0 14mm; display: flex; justify-content: space-between; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <span>FlyRank Assignment A8 • PDF Report Generator</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '16mm',
        bottom: '16mm',
        left: '12mm',
        right: '12mm'
      }
    });
  } finally {
    await browser.close();
  }

  return outputPath;
}
