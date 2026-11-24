import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Printer, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money, paymentLabel, titleCase } from '../lib/format';
import { Modal } from './UI';

export function ReceiptPaper({ order, settings }) {
  if (!order) return null;
  const pending = order.status === 'pending';

  return (
    <div className="receipt-paper" id="receipt-paper">
      <div className="receipt-head">
        <span className="receipt-mark">✳</span>
        <strong>{settings?.restaurantName || 'Table & Thyme'}</strong>
        <small>{settings?.address}</small>
        <small>{settings?.phone}</small>
      </div>
      <div className="receipt-rule" />
      <div className="receipt-meta-grid">
        <div><small>Order</small><b>{order.number}</b></div>
        <div><small>Date</small><b>{formatDateTime(order.createdAt)}</b></div>
        <div><small>Service</small><b>{titleCase(order.type)}{order.table ? ` · Table ${order.table}` : ''}</b></div>
        <div><small>Cashier</small><b>{order.cashierName || '—'}</b></div>
      </div>
      <div className="receipt-rule" />
      <table className="receipt-items">
        <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>
          {order.items?.map((item, index) => (
            <tr key={`${item.menuItem}-${index}`}>
              <td>
                <span>{item.name}</span>
                {item.note && <small>{item.note}</small>}
                <small>{money(item.price)} each</small>
              </td>
              <td>{item.quantity}</td>
              <td>{money(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-rule" />
      <div className="receipt-totals">
        <div><span>Subtotal</span><b>{money(order.subtotal)}</b></div>
        {order.discount > 0 && <div><span>Discount</span><b>−{money(order.discount)}</b></div>}
        <div><span>Tax ({order.taxRate}%)</span><b>{money(order.tax)}</b></div>
        <div className="receipt-grand"><span>{pending ? 'Total due' : 'Total paid'}</span><b>{money(order.total)}</b></div>
        <div><span>Payment</span><b>{paymentLabel(order.paymentMethod)}</b></div>
        {order.amountTendered > 0 && <div><span>Tendered</span><b>{money(order.amountTendered)}</b></div>}
        {order.change > 0 && <div><span>Change</span><b>{money(order.change)}</b></div>}
      </div>
      <div className="receipt-rule" />
      {pending ? (
        <div className="receipt-pending"><Clock3 size={14} /> Awaiting admin confirmation</div>
      ) : (
        order.confirmedByName && <div className="receipt-confirmed"><CheckCircle2 size={14} /> Confirmed by {order.confirmedByName}</div>
      )}
      <p className="receipt-footer">{settings?.receiptFooter || 'Thank you for dining with us.'}</p>
    </div>
  );
}

export function ReceiptModal({ order, onClose }) {
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings'), staleTime: 5 * 60_000 });
  const pending = order?.status === 'pending';

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={pending ? 'Order recorded' : 'Payment confirmed'}
      subtitle={order ? `${order.number} · ${formatDateTime(order.createdAt)}` : ''}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Done</button>
          <button className="btn btn--primary" onClick={() => window.print()}><Printer size={16} /> Print receipt</button>
        </>
      }
    >
      <div className={`receipt-success ${pending ? 'receipt-success--pending' : ''}`}>
        {pending ? <Clock3 size={26} /> : <CheckCircle2 size={26} />}
        <span>{pending ? 'Waiting for admin confirmation' : 'Payment confirmed and counted in sales'}</span>
      </div>
      <ReceiptPaper order={order} settings={settings} />
    </Modal>
  );
}

export function ReceiptSheet({ order, settings, onClose }) {
  return (
    <Modal open={Boolean(order)} onClose={onClose} title={`Order ${order?.number || ''}`} size="medium"
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}><X size={15} /> Close</button>
          <button className="btn btn--primary" onClick={() => window.print()}><Printer size={15} /> Print</button>
        </>
      }>
      <div className="receipt-sheet-wrap"><ReceiptPaper order={order} settings={settings} /></div>
    </Modal>
  );
}
