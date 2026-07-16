const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { Validator, isEmail, isNonEmptyString } = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Seed a new user with a starter set of categories so the dashboard isn't
// empty on first login.
const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', color: '#1F6F50' },
  { name: 'Freelance', type: 'income', color: '#4C9A72' },
  { name: 'Groceries', type: 'expense', color: '#B4483A' },
  { name: 'Rent', type: 'expense', color: '#8A5A2E' },
  { name: 'Transport', type: 'expense', color: '#C9832A' },
  { name: 'Entertainment', type: 'expense', color: '#A85C8C' },
];

router.post('/register', (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const v = new Validator(req.body)
      .require('name', () => isNonEmptyString(name, 100), 'Name is required (max 100 characters)')
      .require('email', () => isEmail(email), 'A valid email address is required')
      .require('password', () => typeof password === 'string' && password.length >= 8, 'Password must be at least 8 characters');

    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

    const passwordHash = bcrypt.hashSync(password, 10);
    const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    const result = insertUser.run(name.trim(), email.toLowerCase().trim(), passwordHash);
    const userId = result.lastInsertRowid;

    const insertCat = db.prepare('INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((cats) => {
      for (const c of cats) insertCat.run(userId, c.name, c.type, c.color);
    });
    insertMany(DEFAULT_CATEGORIES);

    const user = { id: userId, name: name.trim(), email: email.toLowerCase().trim() };
    logger.info('user registered', { userId });
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;
    const v = new Validator(req.body)
      .require('email', () => isEmail(email), 'A valid email address is required')
      .require('password', () => isNonEmptyString(password, 200), 'Password is required');
    if (!v.isValid()) return res.status(422).json({ error: 'Validation failed', fields: v.errors });

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = { id: row.id, name: row.name, email: row.email };
    logger.info('user login', { userId: row.id });
    res.json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    const row = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ user: row });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
