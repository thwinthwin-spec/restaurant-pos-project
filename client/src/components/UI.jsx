import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import { titleCase } from '../lib/format';

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <header className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function MetricCard({ label, value, icon: Icon, hint, tone = 'green', children }) {
  return (
    <Card className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        {Icon && (
          <span className={`metric-icon metric-icon--${tone}`}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <strong className="metric-value">{value}</strong>
      {hint && <small className="metric-hint">{hint}</small>}
      {children}
    </Card>
  );
}

export function Badge({ children, tone = 'neutral', dot = false }) {
  return (
    <span className={`badge badge--${tone}`}>
      {dot && <i className="badge-dot" />}
      {children}
    </span>
  );
}

const STATUS_TONES = {
  paid: 'green',
  completed: 'green',
  active: 'green',
  available: 'green',
  ready: 'blue',
  preparing: 'amber',
  open: 'amber',
  pending: 'amber',
  cancelled: 'red',
  refunded: 'red',
  inactive: 'neutral',
  hidden: 'neutral',
  admin: 'purple',
  cashier: 'neutral',
};

export function StatusPill({ status, children }) {
  return <Badge tone={STATUS_TONES[status] || 'neutral'} dot>{children || titleCase(status)}</Badge>;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={24} /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader">
      <Loader2 size={22} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, retry }) {
  return (
    <div className="empty-state">
      <span className="empty-icon empty-icon--error"><AlertTriangle size={24} /></span>
      <strong>Something went wrong</strong>
      <p>{message}</p>
      {retry && <button className="btn btn--ghost" onClick={retry}>Try again</button>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'medium' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, title, description, confirmLabel = 'Confirm', onConfirm, loading, danger = true }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="small"
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading && <Loader2 size={15} className="spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-copy">{description}</p>
    </Modal>
  );
}

export function Avatar({ name = '', size = 'medium' }) {
  return <span className={`avatar avatar--${size}`}>{name?.charAt(0)?.toUpperCase() || '?'}</span>;
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
