export function formatMoney(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatMonth(ym) {
  if (!ym) return '';
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
