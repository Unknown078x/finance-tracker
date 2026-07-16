const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isValidDate } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

function dateRange(query) {
  const to = isValidDate(query.to) ? query.to : new Date().toISOString().slice(0, 10);
  let from = query.from;
  if (!isValidDate(from)) {
    const d = new Date(to);
    d.setMonth(d.getMonth() - 6);
    from = d.toISOString().slice(0, 10);
  }
  return { from, to };
}

// Overview totals + monthly trend + category breakdown, all in one call so the
// dashboard can render with a single request.
router.get('/summary', (req, res, next) => {
  try {
    const { from, to } = dateRange(req.query);
    const userId = req.user.id;

    const totals = db.prepare(`
      SELECT type, COALESCE(SUM(amount), 0) as total
      FROM transactions WHERE user_id = ? AND occurred_on BETWEEN ? AND ?
      GROUP BY type
    `).all(userId, from, to);

    const income = totals.find(t => t.type === 'income')?.total || 0;
    const expense = totals.find(t => t.type === 'expense')?.total || 0;

    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', occurred_on) as month, type, COALESCE(SUM(amount), 0) as total
      FROM transactions WHERE user_id = ? AND occurred_on BETWEEN ? AND ?
      GROUP BY month, type ORDER BY month ASC
    `).all(userId, from, to);

    const byCategory = db.prepare(`
      SELECT c.id as category_id, c.name as category_name, c.color as category_color, t.type,
             COALESCE(SUM(t.amount), 0) as total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ? AND t.occurred_on BETWEEN ? AND ?
      GROUP BY c.id, t.type ORDER BY total DESC
    `).all(userId, from, to);

    const recent = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ? ORDER BY t.occurred_on DESC, t.id DESC LIMIT 5
    `).all(userId);

    res.json({
      range: { from, to },
      totals: { income, expense, net: income - expense },
      monthly,
      byCategory,
      recent,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
