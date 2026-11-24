import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowUpRight, Banknote, CheckCircle2, ClipboardList, Clock3, CookingPot,
  Plus, ReceiptText, Smartphone, TrendingUp, Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { compactMoney, daysAgo, money, number, timeAgo, today, titleCase } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Loader, MetricCard, PageHeader, StatusPill } from '../components/UI';

export default function OverviewPage() {
  const { user } = useAuth();
  const report = useQuery({
    queryKey: ['reports', 'today'],
    queryFn: () => api.get('/reports'),
    staleTime: 30_000,
  });
  const weekly = useQuery({
    queryKey: ['reports', 'week'],
    queryFn: () => api.get(`/reports?from=${daysAgo(6)}&to=${today()}`),
    staleTime: 60_000,
  });
  const orders = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => api.get('/orders?limit=6'),
    staleTime: 30_000,
  });
  const menu = useQuery({ queryKey: ['menu'], queryFn: () => api.get('/menu?all=true'), staleTime: 60_000 });

  const summary = report.data?.summary || { revenue: 0, count: 0, cash: 0, kpay: 0, cashCount: 0, kpayCount: 0 };
  const pendingSales = report.data?.pending || { amount: 0, count: 0 };
  const chartData = (weekly.data?.trend || []).map((point) => ({
    ...point,
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' }),
  }));
  const activeKitchen = (orders.data?.items || []).filter((order) => ['open', 'preparing', 'ready'].includes(order.fulfillmentStatus)).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        eyebrow="YOUR RESTAURANT AT A GLANCE"
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'there'}.`}
        description="Confirmed payments only — pending orders are not counted yet."
        actions={<Link className="btn btn--primary" to="/pos"><Plus size={16} /> New order</Link>}
      />

      <div className="metric-grid">
        <MetricCard label="Today's sales" value={compactMoney(summary.revenue)} icon={TrendingUp} hint="Confirmed cash + KPay" tone="green" />
        <MetricCard label="Cash today" value={compactMoney(summary.cash)} icon={Banknote} hint={`${number(summary.cashCount)} confirmed sale${summary.cashCount === 1 ? '' : 's'}`} tone="blue" />
        <MetricCard label="KPay today" value={compactMoney(summary.kpay)} icon={Smartphone} hint={`${number(summary.kpayCount)} confirmed sale${summary.kpayCount === 1 ? '' : 's'}`} tone="amber" />
        <MetricCard label="Awaiting confirmation" value={compactMoney(pendingSales.amount)} icon={Clock3} hint={`${number(pendingSales.count)} order${pendingSales.count === 1 ? '' : 's'} not counted yet`} tone="purple">
          <Link className="text-link" to="/orders?status=pending">Review orders →</Link>
        </MetricCard>
      </div>

      {report.isLoading || weekly.isLoading || orders.isLoading ? (
        <Loader label="Gathering today's numbers…" />
      ) : report.isError ? (
        <ErrorState message={report.error.message} retry={() => report.refetch()} />
      ) : (
        <div className="overview-grid">
          <Card className="chart-card">
            <CardHeader
              title="Sales this week"
              subtitle="Confirmed by admin, counted on confirmation day"
              action={<Badge tone="green"><ArrowUpRight size={13} /> {compactMoney(weekly.data?.summary?.revenue || 0)}</Badge>}
            />
            {chartData.length ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2f7a54" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#2f7a54" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(value) => compactMoney(value)} />
                    <Tooltip formatter={(value) => [money(value), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#2f7a54" strokeWidth={2.5} fill="url(#salesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No confirmed sales this week yet" description="Confirm an order to draw the chart." />
            )}
          </Card>

          <Card>
            <CardHeader title="Popular today" subtitle="Guest favourites by quantity" action={<span className="card-spark">✦</span>} />
            <div className="rank-list">
              {(report.data?.dishes || []).slice(0, 6).map((dish, index) => (
                <div className="rank-row" key={dish.name}>
                  <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{dish.name}</strong><small>{money(dish.revenue)} revenue</small></div>
                  <span className="rank-count">{dish.quantity} sold</span>
                </div>
              ))}
              {!report.data?.dishes?.length && <EmptyState title="Nothing popular yet" description="Dishes will appear once orders are confirmed." />}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent orders"
              subtitle="Latest service activity"
              action={<Link className="text-link" to="/orders">View all →</Link>}
            />
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Order</th><th>Type</th><th>Kitchen</th><th>Payment</th><th>Total</th><th>When</th></tr></thead>
                <tbody>
                  {(orders.data?.items || []).map((order) => (
                    <tr key={order._id}>
                      <td><strong>{order.number}</strong><small className="subline">{order.items.length} item{order.items.length === 1 ? '' : 's'}</small></td>
                      <td>{titleCase(order.type)}</td>
                      <td><StatusPill status={order.fulfillmentStatus} /></td>
                      <td><StatusPill status={order.status} /></td>
                      <td><strong>{money(order.total)}</strong></td>
                      <td className="muted">{timeAgo(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!orders.data?.items?.length && <EmptyState title="No orders yet" description="Your first sale will show up here." />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Service pulse" subtitle="What needs attention right now" />
            <div className="pulse-list">
              <div className="pulse-row"><span className="pulse-icon pulse-icon--amber"><Clock3 size={18} /></span><div><strong>Awaiting confirmation</strong><small>Not in sales totals yet</small></div><b>{pendingSales.count}</b></div>
              <div className="pulse-row"><span className="pulse-icon pulse-icon--amber"><CookingPot size={18} /></span><div><strong>In the kitchen</strong><small>Orders waiting or preparing</small></div><b>{activeKitchen}</b></div>
              <div className="pulse-row"><span className="pulse-icon"><ReceiptText size={18} /></span><div><strong>Confirmed orders</strong><small>Paid orders counted today</small></div><b>{summary.count}</b></div>
              <div className="pulse-row"><span className="pulse-icon pulse-icon--blue"><ClipboardList size={18} /></span><div><strong>Menu available</strong><small>Dishes guests can order</small></div><b>{menu.data?.length ?? 0}</b></div>
            </div>
            <Link className="btn btn--ghost btn--block" to="/orders">Open orders &amp; confirm</Link>
          </Card>
        </div>
      )}
    </>
  );
}
