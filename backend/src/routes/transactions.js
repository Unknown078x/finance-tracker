const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { Validator, isPositiveNumber, isValidDate, isOneOf, isNonEmptyString } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

function categoryBelongsToUser(categoryId, userId) {
  return db.prepare('SELECT id, type FROM categories WHERE id = ? AND user_id = ?').get(categoryId, userId);
}

// GET /api/transactions?type=expense&category_id=3&from=2026-01-01&to=2026-12-31&page=1&limit=20
router.get('/', (req, res, next) => {
  try {
    const { type, category_id, from, to, page = 1, limit = 20 } = req.query;
    const clauses = ['t.user_id = ?'];
    const params = [req.user.id];

    if (type && isOneOf(type, ['income', 'expense'])) {
      clauses.push('t.type = ?');
      params.push(type);
    }
    if (category_id) {
      clauses.push('t.category_id = ?');
      params.push(category_id);
    }
    if (from && isValidDate(from)) {
      clauses.push('t.occurred_on >= ?');
      params.push(from);
    }
    if (to && isValidDate(to)) {
      clauses.push('t.occurred_on <= ?');
      params.push(to);
    }

    const where = clauses.join(' AND ');
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const total = db.prepare(`SELECT COUNT(*) as count FROM transactions t WHERE ${where}`).get(...params).count;
    const rows = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE ${where}
      ORDER BY t.occurred_on DESC, t.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({ transactions: rows, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { category_id, type, amount, note, occurred_on } = req.body;
    const v = new Validator(req.body)
      .require('category_id', () => !!category_id, 'A category is required')
      .require('type', () => isOneOf(type, ['income', 'expense']), "Type must be 'income' or 'expense'")
      .require('amount', () => isPositiveNumber(Number(amount)), 'Amount must be a positive number')
      .require('occurred_on', () => isValidDate(occurred_on), 'Date must be in YYYY-MM-DD format');
    if (note !== undefined && note !== null && !isNonEmptyString(String(note), 500) && note !== '') {
      v.errors.note = 'Note must be 500 characters or fewer';
    }
    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    const category = categoryBelongsToUser(category_id, req.user.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (category.type !== type) {
      return res.status(422).json({ error: 'Validation failed', fields: { type: `Category "${category_id}" is a ${category.type} category` } });
    }

    const result = db.prepare(`
      INSERT INTO transactions (user_id, category_id, type, amount, note, occurred_on)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, category_id, type, Number(amount), note || null, occurred_on);

    const created = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ transaction: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    const { category_id, type, amount, note, occurred_on } = req.body;
    const v = new Validator(req.body)
      .require('category_id', () => !!category_id, 'A category is required')
      .require('type', () => isOneOf(type, ['income', 'expense']), "Type must be 'income' or 'expense'")
      .require('amount', () => isPositiveNumber(Number(amount)), 'Amount must be a positive number')
      .require('occurred_on', () => isValidDate(occurred_on), 'Date must be in YYYY-MM-DD format');
    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    const category = categoryBelongsToUser(category_id, req.user.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (category.type !== type) {
      return res.status(422).json({ error: 'Validation failed', fields: { type: `Category "${category_id}" is a ${category.type} category` } });
    }

    db.prepare(`
      UPDATE transactions SET category_id = ?, type = ?, amount = ?, note = ?, occurred_on = ?
      WHERE id = ?
    `).run(category_id, type, Number(amount), note || null, occurred_on, req.params.id);

    const updated = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.id = ?
    `).get(req.params.id);

    res.json({ transaction: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
