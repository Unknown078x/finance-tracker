import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import { formatMoney } from '../utils/format';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: '', target_amount: '', target_date: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    client.get('/goals').then((res) => setGoals(res.data.goals)).catch((err) => setError(apiErrorMessage(err)));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await client.post('/goals', { ...form, target_amount: Number(form.target_amount) });
      setForm({ name: '', target_amount: '', target_date: '' });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function addSaved(goal, delta) {
    const saved_amount = Math.max(0, goal.saved_amount + delta);
    try {
      await client.put(`/goals/${goal.id}`, { ...goal, saved_amount });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await client.delete(`/goals/${id}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Savings goals</h1>
        <p>Set a target and chip away at it.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14 }}>New goal</h3>
        <form className="two-col" onSubmit={handleSubmit} style={{ alignItems: 'end' }}>
          <div className="form-row">
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Emergency fund" />
          </div>
          <div className="form-row">
            <label>Target amount</label>
            <input type="number" min="1" step="0.01" required value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Target date (optional)</label>
            <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add goal'}
          </button>
        </form>
      </div>

      {goals.length === 0 ? (
        <div className="card empty-state">
          <h3>No goals yet</h3>
          <p>Add one above to start tracking progress.</p>
        </div>
      ) : (
        <div className="stat-grid">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
            return (
              <div className="card goal-card" key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{g.name}</strong>
                  <button className="icon-btn danger" onClick={() => handleDelete(g.id)}>Delete</button>
                </div>
                <div className="goal-bar-track"><div className="goal-bar-fill" style={{ width: `${pct}%` }} /></div>
                <div className="tabular" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ${formatMoney(g.saved_amount)} of ${formatMoney(g.target_amount)} ({pct}%)
                </div>
                {g.target_date && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Target: {g.target_date}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost" onClick={() => addSaved(g, -50)}>−$50</button>
                  <button className="btn btn-ghost" onClick={() => addSaved(g, 50)}>+$50</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
