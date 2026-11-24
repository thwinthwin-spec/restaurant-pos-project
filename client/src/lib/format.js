let currencySymbol = 'Ks';

export function setCurrencySymbol(symbol) {
  if (symbol) currencySymbol = symbol;
}

export const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('en-US')} ${currencySymbol}`;
export const compactMoney = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currencySymbol}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K ${currencySymbol}`;
  return money(n);
};
export const number = (value) => (Number(value) || 0).toLocaleString('en-US');

export const titleCase = (value = '') =>
  value
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const paymentLabel = (method) => ({ cash: 'Cash', kpay: 'KPay' }[method] || titleCase(method));

export const timeAgo = (date) => {
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (count) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
};

export const formatDate = (date, options = {}) =>
  new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...options });

export const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
