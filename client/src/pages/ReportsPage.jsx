import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Banknote, CircleDollarSign, Download, ReceiptText, Smartphone, TrendingUp, Utensils } from 'lucide-react';
import { api } from '../lib/api';
import { compactMoney, daysAgo, downloadCsv, money, number, paymentLabel, today, titleCase } from '../lib/format';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Loader, MetricCard, PageHeader } from '../components/UI';

const PIE_COLORS = ['#2f7a54', '#c99a54', '#4d7fb8', '#9b6cb0', '#b56767'];

export default function ReportsPage() {
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [range, setRange] = useState({ from: daysAgo(6), to: today() });

  const report = useQuery({
    queryKey: ['reports', range],
    queryFn: () => api.get(`/reports?from=${range.from}&to=${range.to}`),
    staleTime: 60_000,
  });

  const data = report.data;
  const trend = (data?.trend || []).map((point) => ({
    ...point,
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en', { day: '2-digit', month: 'short' }),
  }));
  const methods = (data?.methods || []).map((row) => ({ name: paymentLabel(row.method), value: row.total }));
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    orders: data?.hourly?.find((row) => row.hour === hour)?.count || 0,
  })).filter((row) => row.orders > 0);

  const exportReport = () => {
    if (!data) return;
    downloadCsv(`sales-${range.from}-to-${range.to}.csv`, [
      ...data.trend.map((row) => ({ Type: 'Daily sales', Date: row.date, Revenue: row.revenue, Orders: row.count })),
      ...data.dishes.map((row) => ({ Type: 'Top dish', Name: row.name, Quantity: row.quantity, Revenue: row.revenue })),
      ...data.methods.map((row) => ({ Type: 'Payment method', Name: row.method, Revenue: row.total, Orders: row.count })),
    ]);
  };

  return (
    <>
      <PageHeader
        eyebrow="KNOW YOUR SERVICE"
        title="Reports"
        description="Confirmed cash and KPay sales, payment mix, and what your guests love most."
        actions={<button className="btn btn--ghost" onClick={exportReport} disabled={!data}><Download size={16} /> Export CSV</button>}
      />

      <Card className="filter-bar">
        <label className="date-field"><span>From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="date-field"><span>To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <button className="btn btn--primary" onClick={() => setRange({ from, to })}>Apply range</button>
        <div className="filter-presets">
          {[[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']].map(([days, label]) => (
            <button key={days} className="btn btn--soft btn--small" onClick={() => { const next = { from: daysAgo(days - 1), to: today() }; setFrom(next.from); setTo(next.to); setRange(next); }}>{label}</button>
          ))}
        </div>
      </Card>

      {report.isLoading ? (
        <Loader label="Building your report…" />
      ) : report.isError ? (
        <ErrorState message={report.error.message} retry={() => report.refetch()} />
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard label="Total revenue" value={compactMoney(data.summary.revenue)} icon={TrendingUp} hint={`${range.from} → ${range.to}`} />
            <MetricCard label="Cash confirmed" value={compactMoney(data.summary.cash)} icon={Banknote} hint={`${number(data.summary.cashCount)} sale${data.summary.cashCount === 1 ? '' : 's'}`} tone="blue" />
            <MetricCard label="KPay confirmed" value={compactMoney(data.summary.kpay)} icon={Smartphone} hint={`${number(data.summary.kpayCount)} sale${data.summary.kpayCount === 1 ? '' : 's'}`} tone="amber" />
            <MetricCard label="Average order" value={compactMoney(data.summary.average)} icon={CircleDollarSign} hint="Revenue per confirmed order" tone="purple" />
          </div>

          <div className="reports-grid">
            <Card className="chart-card chart-card--wide">
              <CardHeader title="Revenue over time" subtitle="Daily confirmed sales by confirmation date" action={<Badge tone="green">{money(data.summary.revenue)}</Badge>} />
              {trend.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                      <defs><linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f7a54" stopOpacity={0.3} /><stop offset="100%" stopColor="#2f7a54" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={compactMoney} />
                      <Tooltip formatter={(value) => [money(value), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#2f7a54" strokeWidth={2.5} fill="url(#reportFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState title="No sales in this range" description="Try a wider date range." />}
            </Card>

            <Card className="chart-card">
              <CardHeader title="Payment mix" subtitle="Revenue by method" />
              {methods.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={methods} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                        {methods.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState title="No payments in range" />}
            </Card>

            <Card className="chart-card">
              <CardHeader title="Top dishes" subtitle="Quantity sold" />
              {data.dishes.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dishes.slice(0, 8)} layout="vertical" margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="var(--line)" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Tooltip formatter={(value) => [`${value} sold`, 'Quantity']} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)' }} />
                      <Bar dataKey="quantity" fill="#2f7a54" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState title="No dishes in range" />}
            </Card>

            <Card className="chart-card">
              <CardHeader title="Busiest hours" subtitle="Orders by hour of day" />
              {hourly.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourly} margin={{ left: -18, right: 8 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Tooltip formatter={(value) => [`${value} orders`, 'Orders']} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)' }} />
                      <Bar dataKey="orders" fill="#c99a54" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState title="No activity in range" />}
            </Card>
          </div>

          <Card>
            <CardHeader title="Breakdown" subtitle="Totals for the selected period" />
            <div className="breakdown-grid">
              <div><span>Gross sales</span><strong>{money(data.summary.subtotal)}</strong></div>
              <div><span>Discounts</span><strong>−{money(data.summary.discount)}</strong></div>
              <div><span>Tax collected</span><strong>{money(data.summary.tax)}</strong></div>
              <div><span>Net revenue</span><strong>{money(data.summary.revenue)}</strong></div>
              <div><span>Cash total</span><strong>{money(data.summary.cash)}</strong></div>
              <div><span>KPay total</span><strong>{money(data.summary.kpay)}</strong></div>
              <div><span>Awaiting confirmation</span><strong>{money(data.pending?.amount || 0)}</strong></div>
              {(data.types || []).map((row) => <div key={row.type}><span>{titleCase(row.type)}</span><strong>{money(row.revenue)}</strong></div>)}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
