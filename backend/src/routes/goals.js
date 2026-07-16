const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { Validator, isNonEmptyString, isPositiveNumber } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ goals: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { name, target_amount, target_date } = req.body;
    const v = new Validator(req.body)
      .require('name', () => isNonEmptyString(name, 100), 'Goal name is required')
      .require('target_amount', () => isPositiveNumber(Number(target_amount)), 'Target amount must be a positive number');
    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    const result = db.prepare('INSERT INTO savings_goals (user_id, name, target_amount, target_date) VALUES (?, ?, ?, ?)')
      .run(req.user.id, name.trim(), Number(target_amount), target_date || null);
    const created = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ goal: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Savings goal not found' });

    const { name, target_amount, saved_amount, target_date } = req.body;
    const v = new Validator(req.body)
      .require('name', () => isNonEmptyString(name, 100), 'Goal name is required')
      .require('target_amount', () => isPositiveNumber(Number(target_amount)), 'Target amount must be a positive number');
    if (saved_amount !== undefined && (Number.isNaN(Number(saved_amount)) || Number(saved_amount) < 0)) {
      v.errors.saved_amount = 'Saved amount must be zero or a positive number';
    }
    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    db.prepare('UPDATE savings_goals SET name = ?, target_amount = ?, saved_amount = ?, target_date = ? WHERE id = ?')
      .run(name.trim(), Number(target_amount), saved_amount !== undefined ? Number(saved_amount) : existing.saved_amount, target_date || null, req.params.id);
    const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
    res.json({ goal: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT id FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Savings goal not found' });
    db.prepare('DELETE FROM savings_goals WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
