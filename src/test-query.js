import { getReportData } from './report-data.js';

const data = getReportData();

// Extract the four required sections for Stage 2 checkpoint
const reportSections = {
  totalOrders: data.totalOrders,
  totalRevenue: data.totalRevenue,
  topProducts: data.topProducts,
  ordersPerDay: data.ordersPerDay
};

console.log(JSON.stringify(reportSections, null, 2));

// Quick sanity check: product revenue must not exceed total revenue
const topProductRev = data.topProducts.reduce((max, p) => Math.max(max, p.revenue), 0);
if (topProductRev > data.totalRevenue) {
  console.error('Data integrity error: Top product revenue exceeds total revenue!');
  process.exit(1);
}
