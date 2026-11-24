import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Card, EmptyState, ErrorState, Field, Loader, PageHeader, StatusPill } from '../components/UI';

export default function StaffPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });

  const staff = useQuery({ queryKey: ['staff'], queryFn: () => api.get('/staff'), staleTime: 30_000 });

  const create = useMutation({
    mutationFn: (values) => api.post('/staff', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setForm({ name: '', email: '', password: '', role: 'cashier' });
      toast('Staff account created.');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const update = useMutation({
    mutationFn: ({ id, values }) => api.patch(`/staff/${id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast('Staff account updated.');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  return (
    <>
      <PageHeader eyebrow="YOUR SERVICE TEAM" title="Staff" description="Give every teammate the right access for their role." />

      <Card className="staff-form-card">
        <form className="staff-form" onSubmit={(event) => { event.preventDefault(); create.mutate(form); }}>
          <Field label="Full name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} placeholder="e.g. Nyein Chan" /></Field>
          <Field label="Email address"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required placeholder="name@restaurant.com" /></Field>
          <Field label="Password" hint="At least 10 characters"><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={10} placeholder="Temporary password" /></Field>
          <Field label="Role"><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="cashier">Cashier</option><option value="admin">Administrator</option></select></Field>
          <button className="btn btn--primary staff-submit" disabled={create.isPending}><Plus size={16} /> {create.isPending ? 'Adding…' : 'Add staff'}</button>
        </form>
      </Card>

      {staff.isLoading ? (
        <Loader label="Loading your team…" />
      ) : staff.isError ? (
        <ErrorState message={staff.error.message} retry={() => staff.refetch()} />
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign in</th><th /></tr></thead>
              <tbody>
                {(staff.data || []).map((member) => (
                  <tr key={member._id}>
                    <td><div className="staff-cell"><Avatar name={member.name} /><span><strong>{member.name}</strong>{member._id === user?.id && <small className="subline">You</small>}</span></div></td>
                    <td className="muted">{member.email}</td>
                    <td>
                      <select className="status-select" value={member.role} disabled={member._id === user?.id} onChange={(event) => update.mutate({ id: member._id, values: { role: event.target.value } })}>
                        <option value="cashier">Cashier</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td><StatusPill status={member.active ? 'active' : 'inactive'} /></td>
                    <td className="muted">{member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'}</td>
                    <td className="row-actions">
                      <button className="btn btn--ghost btn--small" disabled={member._id === user?.id} onClick={() => update.mutate({ id: member._id, values: { active: !member.active } })}>
                        {member.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!staff.data?.length && <EmptyState icon={Users} title="No staff yet" description="Add your first team member above." />}
          </div>
        </Card>
      )}
    </>
  );
}
