import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import client, { apiErrorMessage } from '../api/client';
import { formatMoney, formatMonth } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/reports/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p style={{ color: 'var(--text-muted)' }}>Loading your dashboard…</p>;

  const months = Array.from(new Set(data.monthly.map((m) => m.month))).sort();
  const chartData = months.map((month) => {
    const income = data.monthly.find((m) => m.month === month && m.type === 'income')?.total || 0;
    const expense = data.monthly.find((m) => m.month === month && m.type === 'expense')?.total || 0;
    return { month: formatMonth(month), income, expense };
  });

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your finances over the last six months, at a glance.</p>
      </div>

      <div className="ledger-strip">
        <div className="ledger-strip-row">
          <div className="ledger-strip-item">
            <div className="label">Income</div>
            <div className="value">${formatMoney(data.totals.income)}</div>
          </div>
          <div className="ledger-strip-item">
            <div className="label">Expenses</div>
            <div className="value">${formatMoney(data.totals.expense)}</div>
          </div>
          <div className="ledger-strip-item">
            <div className="label">Net</div>
            <div className="value" style={{ color: data.totals.net >= 0 ? '#8fd6b4' : '#e79082' }}>
              {data.totals.net >= 0 ? '+' : '−'}${formatMoney(Math.abs(data.totals.net))}
            </div>
          </div>
        </div>
      </div>

      <div className="card chart-card" style={{ marginBottom: 24 }}>
        <h3>Income vs. expenses</h3>
        <p className="sub">Monthly totals, {formatMonth(months[0])} – {formatMonth(months[months.length - 1])}</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1F6F50" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#1F6F50" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B4483A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#B4483A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E2D9C4" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#5B6B63' }} axisLine={{ stroke: '#E2D9C4' }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#5B6B63' }} axisLine={false} tickLine={false} width={56} />
            <Tooltip formatter={(v) => `$${formatMoney(v)}`} contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #E2D9C4' }} />
            <Area type="monotone" dataKey="income" stroke="#1F6F50" fill="url(#incomeFill)" strokeWidth={2} name="Income" />
            <Area type="monotone" dataKey="expense" stroke="#B4483A" fill="url(#expenseFill)" strokeWidth={2} name="Expense" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: 16 }}>Recent activity</h3>
            <Link to="/transactions" className="btn btn-ghost">View all</Link>
          </div>
        </div>
        {data.recent.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions yet</h3>
            <p>Add your first income or expense to see it here.</p>
          </div>
        ) : (
          <table className="ledger-table">
            <tbody>
              {data.recent.map((t) => (
                <tr key={t.id}>
                  <td>{t.occurred_on}</td>
                  <td>
                    <span className="category-chip">
                      <span className="dot" style={{ background: t.category_color }} />
                      {t.category_name}
                    </span>
                  </td>
                  <td>{t.note || '—'}</td>
                  <td className={`amount tabular ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                    {t.type === 'income' ? '+' : '−'}${formatMoney(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
