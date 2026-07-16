import { useState } from 'react';
import { todayISO } from '../utils/format';

export default function TransactionForm({ categories, initial, onCancel, onSubmit, submitting, error }) {
  const [form, setForm] = useState(() => ({
    type: initial?.type || 'expense',
    category_id: initial?.category_id || '',
    amount: initial?.amount ?? '',
    note: initial?.note || '',
    occurred_on: initial?.occurred_on || todayISO(),
  }));

  const relevantCategories = categories.filter((c) => c.type === form.type);

  function handleTypeChange(type) {
    const firstMatch = categories.find((c) => c.type === type);
    setForm({ ...form, type, category_id: firstMatch ? firstMatch.id : '' });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount), category_id: Number(form.category_id) });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{initial ? 'Edit transaction' : 'Add transaction'}</h3>
        {error && <div className="banner banner-error">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="two-col">
            <div className="form-row">
              <label>Type</label>
              <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-row">
              <label>Category</label>
              <select required value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="" disabled>Choose one</option>
                {relevantCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="two-col">
            <div className="form-row">
              <label>Amount</label>
              <input type="number" min="0.01" step="0.01" required value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Date</label>
              <input type="date" required value={form.occurred_on}
                onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <label>Note (optional)</label>
            <input maxLength={500} placeholder="What was this for?" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="two-col">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !relevantCategories.length}>
              {submitting ? 'Saving…' : 'Save transaction'}
            </button>
          </div>
          {!relevantCategories.length && (
            <span className="hint">No {form.type} categories yet — add one on the Categories page first.</span>
          )}
        </form>
      </div>
    </div>
  );
}
