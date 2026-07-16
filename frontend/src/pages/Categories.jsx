import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';

const SWATCHES = ['#1F6F50', '#4C9A72', '#C9A24B', '#B4483A', '#8A5A2E', '#C9832A', '#A85C8C', '#4472A8'];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'expense', color: SWATCHES[0] });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    client.get('/categories').then((res) => setCategories(res.data.categories)).catch((err) => setError(apiErrorMessage(err)));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await client.post('/categories', form);
      setForm({ name: '', type: 'expense', color: SWATCHES[0] });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await client.delete(`/categories/${id}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const income = categories.filter((c) => c.type === 'income');
  const expense = categories.filter((c) => c.type === 'expense');

  return (
    <>
      <div className="page-header">
        <h1>Categories</h1>
        <p>Group transactions so reports mean something.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="grid-2">
        <div className="card card-pad">
          <h3 style={{ marginBottom: 14 }}>Add a category</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Name</label>
              <input required maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-row">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {SWATCHES.map((swatch) => (
                  <button type="button" key={swatch} onClick={() => setForm({ ...form, color: swatch })}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', background: swatch, cursor: 'pointer',
                      border: form.color === swatch ? '2px solid var(--ink)' : '2px solid transparent',
                    }} aria-label={`Choose ${swatch}`} />
                ))}
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add category'}
            </button>
          </form>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: 14 }}>Income categories</h3>
          <CategoryList items={income} onDelete={handleDelete} />
          <h3 style={{ margin: '20px 0 14px' }}>Expense categories</h3>
          <CategoryList items={expense} onDelete={handleDelete} />
        </div>
      </div>
    </>
  );
}

function CategoryList({ items, onDelete }) {
  if (!items.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>None yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="category-chip"><span className="dot" style={{ background: c.color }} />{c.name}</span>
          <button className="icon-btn danger" onClick={() => onDelete(c.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
