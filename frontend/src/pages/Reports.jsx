import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import client, { apiErrorMessage } from '../api/client';
import { formatMoney } from '../utils/format';

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = {};
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    client.get('/reports/summary', { params })
      .then((res) => { setData(res.data); setError(''); })
      .catch((err) => setError(apiErrorMessage(err)));
  }, [range]);

  if (error) return <div className="banner banner-error">{error}</div>;

  const expenseCategories = (data?.byCategory || []).filter((c) => c.type === 'expense');
  const incomeCategories = (data?.byCategory || []).filter((c) => c.type === 'income');

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
        <p>See where money comes from, and where it goes.</p>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <div className="form-row">
            <label style={{ fontSize: 12 }}>From</label>
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </div>
          <div className="form-row">
            <label style={{ fontSize: 12 }}>To</label>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
        </div>
      </div>

      {!data ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : (
        <div className="grid-2">
          <BreakdownCard title="Spending by category" sub={`$${formatMoney(data.totals.expense)} total`} rows={expenseCategories} />
          <BreakdownCard title="Income by category" sub={`$${formatMoney(data.totals.income)} total`} rows={incomeCategories} />
        </div>
      )}
    </>
  );
}

function BreakdownCard({ title, sub, rows }) {
  const chartData = rows.map((r) => ({ name: r.category_name, value: r.total, color: r.category_color }));
  const total = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="card chart-card">
      <h3>{title}</h3>
      <p className="sub">{sub}</p>
      {rows.length === 0 ? (
        <div className="empty-state"><p>No transactions in this range.</p></div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `$${formatMoney(v)}`} contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #E2D9C4' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginBottom: 12 }}>
            {rows.map((r) => (
              <div className="legend-row" key={r.category_id}>
                <span className="name">
                  <span className="dot" style={{ background: r.category_color }} />
                  {r.category_name}
                </span>
                <span className="tabular">
                  ${formatMoney(r.total)} <span style={{ color: 'var(--text-muted)' }}>({total ? Math.round((r.total / total) * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
