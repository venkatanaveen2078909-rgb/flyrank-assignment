import { initDb } from './db.js';

export function getReportData(dbInstance = null) {
  const db = dbInstance || initDb();

  // 1. Total number of orders and 2. Total revenue
  const summaryStmt = db.prepare(`
    SELECT 
      COUNT(*) AS total_orders,
      COALESCE(ROUND(SUM(amount), 2), 0) AS total_revenue
    FROM orders
  `);
  const summary = summaryStmt.get();

  // 3. Top 5 products by revenue
  const topProductsStmt = db.prepare(`
    SELECT 
      product,
      ROUND(SUM(amount), 2) AS revenue,
      COUNT(*) AS order_count
    FROM orders
    GROUP BY product
    ORDER BY revenue DESC
    LIMIT 5
  `);
  const topProducts = topProductsStmt.all();

  // 4. Orders per day for the last 7 days
  const ordersPerDayStmt = db.prepare(`
    SELECT 
      date(created_at) AS date,
      COUNT(*) AS order_count,
      ROUND(SUM(amount), 2) AS revenue
    FROM orders
    WHERE date(created_at) >= date('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `);
  const ordersPerDay = ordersPerDayStmt.all();

  // Also fetch all orders for the long table in the PDF report
  const allOrdersStmt = db.prepare(`
    SELECT id, customer, product, amount, created_at
    FROM orders
    ORDER BY created_at DESC
  `);
  const allOrders = allOrdersStmt.all();

  return {
    totalOrders: Number(summary.total_orders),
    totalRevenue: Number(summary.total_revenue),
    topProducts: topProducts.map(row => ({
      product: row.product,
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count)
    })),
    ordersPerDay: ordersPerDay.map(row => ({
      date: row.date,
      orderCount: Number(row.order_count),
      revenue: Number(row.revenue)
    })),
    allOrders: allOrders.map(row => ({
      id: row.id,
      customer: row.customer,
      product: row.product,
      amount: Number(row.amount),
      createdAt: row.created_at
    }))
  };
}
