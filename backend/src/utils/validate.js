// Small dependency-free validation helpers so error messages stay consistent
// across every route.

function isEmail(str) {
  return typeof str === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function isNonEmptyString(str, max = 255) {
  return typeof str === 'string' && str.trim().length > 0 && str.trim().length <= max;
}

function isPositiveNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function isValidDate(str) {
  if (typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(Date.parse(str));
}

function isOneOf(value, options) {
  return options.includes(value);
}

// Collects errors instead of throwing on the first one, so the client
// gets the full picture of what's wrong with the submitted fields.
class Validator {
  constructor(body) {
    this.body = body || {};
    this.errors = {};
  }
  require(field, check, message) {
    const value = this.body[field];
    if (!check(value)) this.errors[field] = message;
    return this;
  }
  isValid() {
    return Object.keys(this.errors).length === 0;
  }
}

module.exports = { isEmail, isNonEmptyString, isPositiveNumber, isValidDate, isOneOf, Validator };
