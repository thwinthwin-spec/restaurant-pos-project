import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Percent, Receipt, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../lib/api';
import { setCurrencySymbol } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Card, ErrorState, Field, Loader, PageHeader } from '../components/UI';

const SECTIONS = [
  {
    title: 'Restaurant profile',
    subtitle: 'Shown on receipts and across the workspace.',
    icon: Building2,
    fields: [
      { key: 'restaurantName', label: 'Restaurant name', placeholder: 'Table & Thyme', wide: true },
      { key: 'address', label: 'Address', placeholder: 'Yangon, Myanmar' },
      { key: 'phone', label: 'Phone number', placeholder: '+95 1 234 567 890' },
    ],
  },
  {
    title: 'Tax & checkout',
    subtitle: 'Applied to every new sale. Past orders keep their original rate.',
    icon: Percent,
    fields: [{ key: 'taxRate', label: 'Tax rate (%)', placeholder: '5', type: 'number', min: 0, max: 100, step: '0.01' }],
  },
  {
    title: 'Receipt',
    subtitle: 'A short note printed at the bottom of every receipt.',
    icon: Receipt,
    fields: [{ key: 'receiptFooter', label: 'Footer message', placeholder: 'Thank you for dining with us.', wide: true }],
  },
];

export default function SettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings'), staleTime: 5 * 60_000 });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings.data && !form) setForm(settings.data);
    if (settings.data?.currencySymbol) setCurrencySymbol(settings.data.currencySymbol);
  }, [settings.data, form]);

  const save = useMutation({
    mutationFn: (values) => api.put('/settings', values),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setCurrencySymbol(data.currencySymbol);
      setForm(data);
      toast('Settings saved.');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  if (settings.isLoading) return <Loader label="Loading settings…" />;
  if (settings.isError) return <ErrorState message={settings.error.message} retry={() => settings.refetch()} />;
  if (!form) return <Loader label="Preparing settings…" />;

  return (
    <>
      <PageHeader eyebrow="RESTAURANT PREFERENCES" title="Settings" description="Keep your checkout and receipt details accurate." />

      <form className="settings-layout" onSubmit={(event) => { event.preventDefault(); save.mutate(form); }}>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card className="settings-card" key={section.title}>
              <div className="settings-card__head">
                <span className="settings-card__icon"><Icon size={19} /></span>
                <div><h2>{section.title}</h2><p>{section.subtitle}</p></div>
              </div>
              <div className="settings-fields">
                {section.fields.map((field) => (
                  <Field key={field.key} label={field.label} className={field.wide ? 'field--wide' : ''}>
                    <input
                      type={field.type || 'text'}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={form[field.key] ?? ''}
                      onChange={(event) => setForm({ ...form, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value })}
                      placeholder={field.placeholder}
                    />
                  </Field>
                ))}
              </div>
            </Card>
          );
        })}

        <Card className="settings-note">
          <div><SettingsIcon size={18} /><span><strong>Currency: Myanmar Kyat (MMK)</strong><small>All prices and totals are recorded in kyats.</small></span></div>
          <button className="btn btn--primary" type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : <><Check size={16} /> Save changes</>}</button>
        </Card>
      </form>
    </>
  );
}
