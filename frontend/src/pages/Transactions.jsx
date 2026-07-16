import { useEffect, useState, useCallback } from 'react';
import client, { apiErrorMessage } from '../api/client';
import { formatMoney } from '../utils/format';
import TransactionForm from '../components/TransactionForm';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ type: '', category_id: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | transaction object
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(() => {
    client.get('/categories').then((res) => setCategories(res.data.categories)).catch(() => {});
  }, []);

  const loadTransactions = useCallback((page = 1) => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (filters.type) params.type = filters.type;
    if (filters.category_id) params.category_id = filters.category_id;
    client.get('/transactions', { params })
      .then((res) => {
        setTransactions(res.data.transactions);
        setMeta({ page: res.data.page, totalPages: res.data.totalPages, total: res.data.total });
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadTransactions(1); }, [loadTransactions]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFormError('');
    try {
      if (modal && modal !== 'create') {
        await client.put(`/transactions/${modal.id}`, payload);
      } else {
        await client.post('/transactions', payload);
      }
      setModal(null);
      loadTransactions(meta.page);
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try {
      await client.delete(`/transactions/${id}`);
      loadTransactions(meta.page);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Transactions</h1>
        <p>Every income and expense entry, in one ledger.</p>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add transaction</button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <h3>Nothing here yet</h3>
            <p>Try a different filter, or add a transaction to get started.</p>
          </div>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.occurred_on}</td>
                  <td>
                    <span className="category-chip">
                      <span className="dot" style={{ background: t.category_color }} />
                      {t.category_name}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.note || '—'}</td>
                  <td className={`amount tabular ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                    {t.type === 'income' ? '+' : '−'}${formatMoney(t.amount)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setModal(t)}>Edit</button>
                      <button className="icon-btn danger" onClick={() => handleDelete(t.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="toolbar" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button className="btn btn-ghost" disabled={meta.page <= 1} onClick={() => loadTransactions(meta.page - 1)}>Previous</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {meta.page} of {meta.totalPages} · {meta.total} total</span>
          <button className="btn btn-ghost" disabled={meta.page >= meta.totalPages} onClick={() => loadTransactions(meta.page + 1)}>Next</button>
        </div>
      )}

      {modal && (
        <TransactionForm
          categories={categories}
          initial={modal === 'create' ? null : modal}
          onCancel={() => { setModal(null); setFormError(''); }}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={formError}
        />
      )}
    </>
  );
}
