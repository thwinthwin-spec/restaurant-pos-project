import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Utensils } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SetupPage() {
  const { setup, isSetupLoading, setUser, refreshSetup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const isFirstRun = Boolean(setup?.needsAdmin);

  const mutation = useMutation({
    mutationFn: (values) =>
      isFirstRun ? api.post('/setup/admin', values) : api.post('/auth/login', values),
    onSuccess: (data) => {
      setUser(data.user);
      refreshSetup();
      toast(isFirstRun ? 'Your restaurant is ready to serve.' : `Welcome back, ${data.user.name.split(' ')[0]}.`);
      navigate('/', { replace: true });
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const submit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    mutation.mutate(isFirstRun ? { ...values, taxRate: Number(values.taxRate) } : values);
  };

  if (isSetupLoading) {
    return <div className="auth-loading"><span className="brand-mark">✳</span><span>Preparing your workspace…</span></div>;
  }

  return (
    <div className="auth-shell">
      <section className="auth-art">
        <div className="auth-art__top">
          <span className="brand-mark brand-mark--lg">✳</span>
          <span className="auth-brand">TABLE <em>&</em> THYME</span>
        </div>
        <div className="auth-art__copy">
          <span className="eyebrow eyebrow--light">RESTAURANT OPERATIONS</span>
          <h1>A little more flow<br />in every service.</h1>
          <p>Your dining room, menu and daily sales in one calm place — built for the rhythm of hospitality.</p>
          <div className="auth-features">
            <span><Sparkles size={15} /> Fast checkout</span>
            <span><ShieldCheck size={15} /> Secure by design</span>
            <span><Utensils size={15} /> Kitchen ready</span>
          </div>
        </div>
        <div className="auth-art__foot">Crafted for the people behind the pass.</div>
        <div className="auth-art__orb auth-art__orb--one" />
        <div className="auth-art__orb auth-art__orb--two" />
      </section>

      <section className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow">{isFirstRun ? 'FIRST-TIME SETUP' : 'WELCOME BACK'}</span>
          <h2>{isFirstRun ? 'Set up your restaurant' : 'Sign in to your POS'}</h2>
          <p className="auth-subtitle">
            {isFirstRun
              ? 'Create your administrator account and set the tax rate for your restaurant.'
              : 'Enter your staff credentials to continue where you left off.'}
          </p>

          <div className="auth-fields">
            {isFirstRun && (
              <>
                <label className="field">
                  <span className="field-label">Restaurant name</span>
                  <input name="restaurantName" placeholder="e.g. Golden Lotus Kitchen" required minLength="2" />
                </label>
                <label className="field">
                  <span className="field-label">Administrator name</span>
                  <input name="name" placeholder="Your full name" required minLength="2" />
                </label>
              </>
            )}

            <label className="field">
              <span className="field-label">Email address</span>
              <span className="input-with-icon"><Mail size={16} /><input name="email" type="email" placeholder="you@restaurant.com" required autoComplete="username" /></span>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <span className="input-with-icon">
                <LockKeyhole size={16} />
                <input name="password" type={showPassword ? 'text' : 'password'} placeholder={isFirstRun ? 'At least 10 characters' : 'Your password'} minLength={isFirstRun ? 10 : 1} required autoComplete={isFirstRun ? 'new-password' : 'current-password'} />
                <button type="button" className="input-icon-button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            {isFirstRun && (
              <label className="field">
                <span className="field-label">Tax rate (%)</span>
                <span className="input-suffix"><input name="taxRate" type="number" min="0" max="100" step="0.01" placeholder="e.g. 5" required /><span>%</span></span>
                <small className="field-hint">Applied to every new sale. You can change it later in Settings.</small>
              </label>
            )}
          </div>

          <button className="btn btn--primary btn--block auth-submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Please wait…' : isFirstRun ? 'Create admin & continue' : 'Sign in'}
            <ArrowRight size={17} />
          </button>

          {mutation.isError && <p className="auth-error">{mutation.error.message}</p>}

          <p className="auth-footnote">Secure restaurant workspace <span>·</span> Myanmar Kyat (MMK)</p>
        </form>
      </section>
    </div>
  );
}
