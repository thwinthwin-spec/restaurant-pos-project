import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, LayoutGrid, List, Search, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money, paymentLabel, titleCase } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, Loader, PageHeader, StatusPill } from '../components/UI';
import { ReceiptSheet } from '../components/Receipt';

const STEPS = ['open', 'preparing', 'ready', 'completed'];

export default function OrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState('list');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [method, setMethod] = useState('');
  const [fulfillment, setFulfillment] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => setQuery(searchParams.get('q') || ''), [searchParams]);
  useEffect(() => setPage(1), [query, type, paymentStatus, method, fulfillment, from, to]);

  const params = new URLSearchParams({ page: String(page), limit: '25' });
  if (query) params.set('q', query);
  if (type) params.set('type', type);
  if (paymentStatus) params.set('status', paymentStatus);
  if (method) params.set('paymentMethod', method);
  if (fulfillment) params.set('fulfillmentStatus', fulfillment);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const orders = useQuery({
    queryKey: ['orders', params.toString()],
    queryFn: () => api.get(`/orders?${params}`),
    staleTime: 20_000,
  });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings'), staleTime: 5 * 60_000 });

  const invalidateSales = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const confirmMutation = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/confirm`),
    onSuccess: (order) => {
      invalidateSales();
      toast(`${order.number} confirmed · ${money(order.total)} added to sales.`);
    },
    onError: (error) => toast(error.message, 'error'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/fulfillment`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast('Kitchen status updated.');
    },
    onError: (error) => toast(error.message, 'error'),
  });
  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/cancel`),
    onSuccess: () => {
      invalidateSales();
      setCancelTarget(null);
      toast('Order cancelled.');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const items = orders.data?.items || [];
  const pendingCount = items.filter((order) => order.status === 'pending').length;
  const hasFilters = Boolean(query || type || paymentStatus || method || fulfillment || from || to);

  const clearFilters = () => {
    setQuery(''); setType(''); setPaymentStatus(''); setMethod(''); setFulfillment(''); setFrom(''); setTo('');
  };

  const confirmButton = (order, compact = false) =>
    user?.role === 'admin' && order.status === 'pending' ? (
      <button
        className={`btn btn--primary btn--small${compact ? ' btn--block' : ''}`}
        disabled={confirmMutation.isPending}
        onClick={() => confirmMutation.mutate(order._id)}
      >
        <CheckCircle2 size={14} /> Confirm payment
      </button>
    ) : null;

  return (
    <>
      <PageHeader
        eyebrow="SERVICE HISTORY"
        title="Orders"
        description="Confirm payments, then track every dine-in, takeaway and delivery to handover."
        actions={
          <div className="segmented segmented--compact">
            <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}><List size={15} /> List</button>
            <button className={view === 'board' ? 'is-active' : ''} onClick={() => setView('board')}><LayoutGrid size={15} /> Kitchen board</button>
          </div>
        }
      />

      {pendingCount > 0 && (
        <Card className="pending-strip">
          <span className="pulse-icon pulse-icon--amber"><CheckCircle2 size={18} /></span>
          <div>
            <strong>{pendingCount} order{pendingCount === 1 ? '' : 's'} awaiting confirmation</strong>
            <small>Confirm a payment to add its total to today's sales and Cash / KPay totals.</small>
          </div>
          {user?.role === 'admin' && <Badge tone="amber">Admin action needed</Badge>}
        </Card>
      )}

      <Card className="filter-bar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order number, dish or table…" /></label>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Service type">
          <option value="">All service types</option>
          <option value="dine-in">Dine in</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>
        <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} aria-label="Payment status">
          <option value="">All payments</option>
          <option value="pending">Awaiting confirmation</option>
          <option value="paid">Confirmed / paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={method} onChange={(event) => setMethod(event.target.value)} aria-label="Payment method">
          <option value="">Cash &amp; KPay</option>
          <option value="cash">Cash</option>
          <option value="kpay">KPay</option>
        </select>
        <select value={fulfillment} onChange={(event) => setFulfillment(event.target.value)} aria-label="Kitchen status">
          <option value="">All kitchen statuses</option>
          {STEPS.map((step) => <option key={step} value={step}>{titleCase(step)}</option>)}
        </select>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
        {hasFilters && <button className="btn btn--ghost btn--small" onClick={clearFilters}><X size={14} /> Clear</button>}
      </Card>

      {orders.isLoading ? (
        <Loader label="Loading orders…" />
      ) : orders.isError ? (
        <ErrorState message={orders.error.message} retry={() => orders.refetch()} />
      ) : view === 'board' ? (
        <div className="kitchen-board">
          {STEPS.map((step) => {
            const column = items.filter((order) => (order.fulfillmentStatus || 'open') === step);
            const next = STEPS[STEPS.indexOf(step) + 1];
            return (
              <div className="board-column" key={step}>
                <header><strong>{titleCase(step)}</strong><Badge tone={step === 'completed' ? 'green' : step === 'ready' ? 'blue' : 'amber'}>{column.length}</Badge></header>
                <div className="board-column__body">
                  {column.map((order) => (
                    <article className="order-ticket" key={order._id}>
                      <div className="ticket-top"><strong>{order.number}</strong><span>{titleCase(order.type)}{order.table ? ` · T${order.table}` : ''}</span></div>
                      <div className="ticket-payment">
                        <span>{paymentLabel(order.paymentMethod)}</span>
                        <StatusPill status={order.status} />
                      </div>
                      <ul>{order.items.map((line, index) => <li key={`${line.menuItem}-${index}`}><span>{line.quantity}×</span> {line.name}</li>)}</ul>
                      <div className="ticket-foot">
                        <span>{new Date(order.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                        <b>{money(order.total)}</b>
                      </div>
                      <div className="ticket-actions">
                        <button className="btn btn--ghost btn--small" onClick={() => setSelected(order)}>View</button>
                        {confirmButton(order, true)}
                        {next && <button className="btn btn--soft btn--small" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: order._id, status: next })}>Move to {titleCase(next)}</button>}
                      </div>
                    </article>
                  ))}
                  {!column.length && <p className="board-empty">Nothing here</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Type</th><th>Items</th><th>Payment</th><th>Kitchen</th><th>Total</th><th>Placed</th><th /></tr></thead>
              <tbody>
                {items.map((order) => (
                  <tr key={order._id}>
                    <td><strong>{order.number}</strong><small className="subline">{order.cashierName || '—'}</small></td>
                    <td>{titleCase(order.type)}{order.table ? <small className="subline">Table {order.table}</small> : null}</td>
                    <td className="items-cell">{order.items.map((line) => `${line.name} ×${line.quantity}`).join(', ')}</td>
                    <td>
                      <strong>{paymentLabel(order.paymentMethod)}</strong>
                      <small className="subline"><StatusPill status={order.status} /></small>
                    </td>
                    <td>
                      <select className="status-select" value={order.fulfillmentStatus || 'open'} onChange={(event) => statusMutation.mutate({ id: order._id, status: event.target.value })}>
                        {STEPS.map((step) => <option key={step} value={step}>{titleCase(step)}</option>)}
                      </select>
                    </td>
                    <td><strong>{money(order.total)}</strong></td>
                    <td className="muted">{formatDateTime(order.createdAt)}</td>
                    <td className="row-actions">
                      <button className="btn btn--ghost btn--small" onClick={() => setSelected(order)}>Receipt</button>
                      {confirmButton(order)}
                      {user?.role === 'admin' && ['paid', 'pending'].includes(order.status) && <button className="btn btn--danger-text btn--small" onClick={() => setCancelTarget(order)}>Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <EmptyState icon={ClipboardList} title="No orders found" description="Adjust your filters or create a new sale at the point of sale." />}
          </div>

          {orders.data?.pages > 1 && (
            <footer className="pagination">
              <span>Page {orders.data.page} of {orders.data.pages} · {orders.data.total} orders</span>
              <div>
                <button className="icon-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} /></button>
                <button className="icon-button" disabled={page >= orders.data.pages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={17} /></button>
              </div>
            </footer>
          )}
        </Card>
      )}

      <ReceiptSheet order={selected} settings={settings.data} onClose={() => setSelected(null)} />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this order?"
        description={`${cancelTarget?.number || ''} will be marked as cancelled and removed from sales reports. This cannot be undone.`}
        confirmLabel="Cancel order"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(cancelTarget._id)}
      />
    </>
  );
}
