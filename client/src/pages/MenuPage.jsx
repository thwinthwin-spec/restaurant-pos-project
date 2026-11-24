import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2, Utensils } from 'lucide-react';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, Field, Loader, Modal, PageHeader, StatusPill } from '../components/UI';

const EMPTY = { name: '', category: '', description: '', price: '', image: '', emoji: '✳', sortOrder: 0, featured: false, active: true };

export default function MenuPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);

  const menu = useQuery({
    queryKey: ['menu', 'all'],
    queryFn: () => api.get('/menu?all=true'),
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: (values) => {
      const payload = { ...values, price: Number(values.price), sortOrder: Number(values.sortOrder) || 0 };
      return editing ? api.patch(`/menu/${editing._id}`, payload) : api.post('/menu', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setEditing(null);
      toast(editing ? 'Menu item updated.' : 'Dish added to your menu.');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const toggle = useMutation({
    mutationFn: (item) => api.patch(`/menu/${item._id}`, { active: !item.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast('Availability updated.');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: (item) => api.delete(`/menu/${item._id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setDeleting(null);
      toast('Menu item removed.');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const items = menu.data || [];
  const categories = useMemo(() => ['All', ...new Set(items.map((item) => item.category))], [items]);
  const visible = items.filter(
    (item) =>
      (category === 'All' || item.category === category) &&
      (!query || `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())),
  );

  const openNew = () => { setEditing(false); setForm(EMPTY); };
  const openEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item, price: String(item.price) }); };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    save.mutate(form);
  };

  return (
    <>
      <PageHeader
        eyebrow="YOUR KITCHEN, YOUR MENU"
        title="Menu items"
        description="Keep dishes, prices and availability up to date for your team."
        actions={<button className="btn btn--primary" onClick={openNew}><Plus size={16} /> Add dish</button>}
      />

      <Card className="filter-bar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dishes…" /></label>
        <div className="category-row category-row--inline">
          {categories.map((item) => <button key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <Badge tone="neutral">{items.length} dishes</Badge>
      </Card>

      {menu.isLoading ? (
        <Loader label="Loading menu…" />
      ) : menu.isError ? (
        <ErrorState message={menu.error.message} retry={() => menu.refetch()} />
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="data-table data-table--menu">
              <thead><tr><th>Dish</th><th>Category</th><th>Price</th><th>Availability</th><th>Featured</th><th /></tr></thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="dish-cell">
                        <span className="dish-thumb">
                          {item.image ? <img src={item.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
                          <span>{item.emoji || '✳'}</span>
                        </span>
                        <span><strong>{item.name}</strong><small>{item.description || '—'}</small></span>
                      </div>
                    </td>
                    <td><Badge tone="neutral">{item.category}</Badge></td>
                    <td><strong>{money(item.price)}</strong></td>
                    <td><StatusPill status={item.active ? 'available' : 'hidden'} /></td>
                    <td>{item.featured ? <Badge tone="amber">Popular</Badge> : <span className="muted">—</span>}</td>
                    <td className="row-actions">
                      <button className="btn btn--ghost btn--small" onClick={() => toggle.mutate(item)}>{item.active ? 'Hide' : 'Show'}</button>
                      <button className="icon-button" onClick={() => openEdit(item)} title="Edit"><Pencil size={15} /></button>
                      <button className="icon-button icon-button--danger" onClick={() => setDeleting(item)} title="Delete"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <EmptyState icon={Utensils} title="No dishes found" description="Add your first dish or adjust the filters." />}
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing && editing._id ? 'Edit menu item' : 'Add a dish'}
        subtitle="These details appear on the point-of-sale screen and receipts."
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn--primary" form="menu-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save dish'}</button>
          </>
        }
      >
        <form id="menu-form" className="form-grid" onSubmit={submit}>
          <Field label="Dish name"><input value={form.name} onChange={(event) => update('name', event.target.value)} required maxLength={100} placeholder="e.g. Mohinga" /></Field>
          <Field label="Category"><input value={form.category} onChange={(event) => update('category', event.target.value)} required maxLength={50} placeholder="e.g. Noodles" list="menu-categories" />
            <datalist id="menu-categories">{categories.filter((item) => item !== 'All').map((item) => <option key={item} value={item} />)}</datalist>
          </Field>
          <Field label="Price (MMK)"><input type="number" min="0" value={form.price} onChange={(event) => update('price', event.target.value)} required placeholder="4500" /></Field>
          <Field label="Emoji"><input value={form.emoji} onChange={(event) => update('emoji', event.target.value)} maxLength={8} placeholder="🍜" /></Field>
          <Field label="Image URL" className="field--wide"><input value={form.image} onChange={(event) => update('image', event.target.value)} placeholder="https://…" /></Field>
          <Field label="Description" className="field--wide"><input value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={240} placeholder="Short description for your team" /></Field>
          <Field label="Sort order"><input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', event.target.value)} /></Field>
          <div className="form-switches">
            <label><input type="checkbox" checked={form.active} onChange={(event) => update('active', event.target.checked)} /> Available to order</label>
            <label><input type="checkbox" checked={form.featured} onChange={(event) => update('featured', event.target.checked)} /> Mark as popular</label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this dish?"
        description={`${deleting?.name || ''} will be removed from the menu. Past orders keep their original details.`}
        confirmLabel="Delete dish"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting)}
      />
    </>
  );
}
