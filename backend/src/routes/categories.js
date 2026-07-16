const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { Validator, isNonEmptyString, isOneOf } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name').all(req.user.id);
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { name, type, color } = req.body;
    const v = new Validator(req.body)
      .require('name', () => isNonEmptyString(name, 50), 'Category name is required (max 50 characters)')
      .require('type', () => isOneOf(type, ['income', 'expense']), "Type must be 'income' or 'expense'");
    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    const dup = db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?')
      .get(req.user.id, name.trim(), type);
    if (dup) return res.status(409).json({ error: 'A category with that name and type already exists' });

    const result = db.prepare('INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)')
      .run(req.user.id, name.trim(), type, color || '#1F6F50');
    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ category: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const { name, type, color } = req.body;
    const v = new Validator(req.body)
      .require('name', () => isNonEmptyString(name, 50), 'Category name is required (max 50 characters)')
      .require('type', () => isOneOf(type, ['income', 'expense']), "Type must be 'income' or 'expense'");
    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    db.prepare('UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ?')
      .run(name.trim(), type, color || existing.color, req.params.id);
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json({ category: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const inUse = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(req.params.id);
    if (inUse.count > 0) {
      return res.status(409).json({ error: 'Cannot delete a category that has transactions. Reassign or delete those transactions first.' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
