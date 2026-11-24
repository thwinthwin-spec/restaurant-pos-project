import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote, Check, ChevronRight, CircleDollarSign, Clock3, Minus, Plus, ReceiptText,
  Search, Smartphone, Sparkles, Trash2, UtensilsCrossed,
} from 'lucide-react';
import { api } from '../lib/api';
import { money, today } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { EmptyState, ErrorState, Loader, PageHeader } from '../components/UI';
import { ReceiptModal } from '../components/Receipt';

const SERVICE_TYPES = [
  { id: 'dine-in', label: 'Dine in', icon: UtensilsCrossed },
  { id: 'takeaway', label: 'Takeaway', icon: ReceiptText },
  { id: 'delivery', label: 'Delivery', icon: CircleDollarSign },
];

const PAYMENTS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'kpay', label: 'KPay', icon: Smartphone },
];

const loadCart = () => {
  try {
    return JSON.parse(sessionStorage.getItem('pos-cart') || '[]');
  } catch {
    return [];
  }
};

export default function PosPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const searchRef = useRef(null);

  const [cart, setCart] = useState(loadCart);
  const [service, setService] = useState('dine-in');
  const [table, setTable] = useState('');
  const [customer, setCustomer] = useState('');
  const [discount, setDiscount] = useState('');
  const [tendered, setTendered] = useState('');
  const [payment, setPayment] = useState('cash');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => sessionStorage.setItem('pos-cart', JSON.stringify(cart)), [cart]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const menu = useQuery({ queryKey: ['menu'], queryFn: () => api.get('/menu'), staleTime: 2 * 60_000 });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings'), staleTime: 5 * 60_000 });
  const orders = useQuery({
    queryKey: ['orders', { limit: 100 }],
    queryFn: () => api.get('/orders?limit=100'),
    staleTime: 30_000,
  });

  const taxRate = Number(settings.data?.taxRate ?? 0);
  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.price * line.quantity, 0), [cart]);
  const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxable = Math.max(0, subtotal - discountValue);
  const tax = Math.round((taxable * taxRate) / 100);
  const total = taxable + tax;
  const change = payment === 'cash' && Number(tendered) > total ? Number(tendered) - total : 0;

  const categories = useMemo(() => ['All', ...new Set((menu.data || []).map((item) => item.category))], [menu.data]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (menu.data || []).filter(
      (item) =>
        (category === 'All' || item.category === category) &&
        (!term || item.name.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term)),
    );
  }, [menu.data, category, query]);

  const checkout = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: (order) => {
      setReceipt(order);
      setCart([]);
      setDiscount('');
      setTendered('');
      setTable('');
      setCustomer('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast(`${order.number} recorded · ${money(order.total)} awaiting admin confirmation.`);
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const addItem = (item) => {
    setCart((current) => {
      const existing = current.find((line) => line.menuItem === item._id);
      if (existing) return current.map((line) => (line.menuItem === item._id ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line));
      return [...current, { menuItem: item._id, name: item.name, price: item.price, quantity: 1, note: '', emoji: item.emoji, image: item.image }];
    });
  };

  const changeQuantity = (id, amount) =>
    setCart((current) =>
      current
        .map((line) => (line.menuItem === id ? { ...line, quantity: line.quantity + amount } : line))
        .filter((line) => line.quantity > 0),
    );

  const ordersToday = (orders.data?.items || []).filter((order) => new Date(order.createdAt).toDateString() === new Date().toDateString()).length;

  return (
    <>
      <PageHeader
        eyebrow="SERVICE DESK"
        title="Point of sale"
        description="Build an order, choose Cash or KPay, and let admin confirm the sale."
        actions={<span className="today-pill"><i className="live-dot" /> {ordersToday} orders today</span>}
      />

      <div className="pos-layout">
        <section className="card menu-panel">
          <div className="menu-toolbar">
            <div className="segmented">
              {SERVICE_TYPES.map(({ id, label, icon: Icon }) => (
                <button key={id} className={service === id ? 'is-active' : ''} onClick={() => setService(id)}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <label className="search-field">
              <Search size={16} />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a dish…" />
              <kbd>/</kbd>
            </label>
          </div>

          {(service === 'dine-in' || service === 'delivery') && (
            <div className="order-context">
              <label>
                <span>{service === 'dine-in' ? 'TABLE' : 'DELIVERY TO'}</span>
                <input value={table} onChange={(event) => setTable(event.target.value)} placeholder={service === 'dine-in' ? 'Table number' : 'Area / address'} maxLength={30} />
              </label>
              <label>
                <span>CUSTOMER (OPTIONAL)</span>
                <input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Guest name" maxLength={80} />
              </label>
            </div>
          )}

          <div className="category-row">
            {categories.map((item) => (
              <button key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>

          {menu.isLoading ? (
            <Loader label="Loading your menu…" />
          ) : menu.isError ? (
            <ErrorState message={menu.error.message} retry={() => menu.refetch()} />
          ) : visible.length === 0 ? (
            <EmptyState icon={UtensilsCrossed} title="No dishes found" description="Try another category or add menu items as an administrator." />
          ) : (
            <div className="dish-grid">
              {visible.map((item, index) => (
                <button className="dish-card" key={item._id} onClick={() => addItem(item)}>
                  <div className={`dish-image dish-image--${index % 6}`}>
                    {item.image && <img src={item.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                    <span className="dish-emoji">{item.emoji || '✳'}</span>
                    {item.featured && <span className="dish-featured"><Sparkles size={12} /> Popular</span>}
                    <span className="dish-add"><Plus size={18} /></span>
                  </div>
                  <div className="dish-copy">
                    <small>{item.category}</small>
                    <strong>{item.name}</strong>
                    {item.description && <span className="dish-desc">{item.description}</span>}
                    <b>{money(item.price)}</b>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="card cart-panel">
          <header className="cart-header">
            <div>
              <span className="eyebrow">CURRENT ORDER</span>
              <h2>{service === 'dine-in' ? (table ? `Table ${table}` : 'New dine-in') : service === 'delivery' ? 'Delivery order' : 'Takeaway order'}</h2>
              {customer && <small>For {customer}</small>}
            </div>
            <button className="icon-button" onClick={() => setCart([])} disabled={!cart.length} title="Clear order"><Trash2 size={17} /></button>
          </header>

          <div className="cart-lines">
            {cart.length === 0 ? (
              <EmptyState icon={ReceiptText} title="Your order starts here" description="Add a dish from the menu to get started." />
            ) : (
              cart.map((line) => (
                <div className="cart-line" key={line.menuItem}>
                  <span className="cart-line__icon">{line.emoji || '✳'}</span>
                  <div className="cart-line__copy">
                    <strong>{line.name}</strong>
                    <small>{money(line.price)} each</small>
                    <input
                      value={line.note}
                      onChange={(event) => setCart((current) => current.map((item) => (item.menuItem === line.menuItem ? { ...item, note: event.target.value } : item)))}
                      placeholder="Kitchen note…"
                      maxLength={200}
                    />
                  </div>
                  <div className="cart-line__right">
                    <div className="qty-stepper">
                      <button onClick={() => changeQuantity(line.menuItem, -1)} aria-label="Decrease quantity"><Minus size={13} /></button>
                      <span>{line.quantity}</span>
                      <button onClick={() => changeQuantity(line.menuItem, 1)} aria-label="Increase quantity"><Plus size={13} /></button>
                    </div>
                    <b>{money(line.price * line.quantity)}</b>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-summary">
            <label className="discount-field">
              <span>Discount</span>
              <span className="input-suffix"><input type="number" min="0" max={subtotal} value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0" /><span>{settings.data?.currencySymbol || 'Ks'}</span></span>
            </label>
            <div className="summary-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div className="summary-row"><span>Tax <small>({taxRate}%)</small></span><b>{money(tax)}</b></div>
            <div className="summary-total"><span>Total due</span><strong>{money(total)}</strong></div>

            <span className="field-label payment-label">PAYMENT METHOD</span>
            <div className="payment-grid">
              {PAYMENTS.map(({ id, label, icon: Icon }) => (
                <button key={id} className={payment === id ? 'is-active' : ''} onClick={() => setPayment(id)}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>

            {payment === 'cash' && (
              <label className="tendered-field">
                <span>Cash received <small>(optional)</small></span>
                <input type="number" min="0" value={tendered} onChange={(event) => setTendered(event.target.value)} placeholder={String(total)} />
                {change > 0 && <em>Change: {money(change)}</em>}
              </label>
            )}

            <button
              className="btn btn--primary btn--block charge-button"
              disabled={!cart.length || checkout.isPending || !settings.data}
              onClick={() =>
                checkout.mutate({
                  type: service,
                  table: service === 'dine-in' ? table : '',
                  customerName: customer,
                  notes: '',
                  items: cart.map((line) => ({ menuItem: line.menuItem, quantity: line.quantity, note: line.note })),
                  discount: discountValue,
                  paymentMethod: payment,
                  amountTendered: payment === 'cash' ? Number(tendered) || 0 : 0,
                })
              }
            >
              {checkout.isPending ? 'Sending…' : <>Place order · {money(total)} <ChevronRight size={18} /></>}
            </button>
            <p className="secure-note"><Check size={13} /> Admin confirms payment before it counts as a sale</p>
          </div>
        </aside>
      </div>

      <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
