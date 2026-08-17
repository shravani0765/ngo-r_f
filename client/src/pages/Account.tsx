import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api, token, User } from '../lib/api';
import { Card, H1, Btn, Field, Input, Select, Textarea, Alert, useToast } from '../lib/ui';
import { useAuth, homeFor } from '../App';

const DEMOS = [
  ['Auditor', 'admin@ngocommons.demo', 'Admin@123'],
  ['NGO', 'ngo@ngocommons.demo', 'NGO@1234'],
  ['Donor', 'donor@ngocommons.demo', 'Donor@123'],
  ['Public', 'public@ngocommons.demo', 'Public@123']
];

export function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (e: string, p: string) => {
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(e, p);
      toast(`Signed in as ${user.name}.`, 'success');
      navigate(location.state?.from ?? homeFor(user.role), { replace: true });
    } catch (err: any) {
      // Show the server's actual reason, not a generic status code.
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <H1>Sign in</H1>

      <Card>
        <form onSubmit={e => { e.preventDefault(); go(email, password); }} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Field label="Email">
            <Input type="email" required autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.org" />
          </Field>

          <Field label="Password">
            <Input type="password" required autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>

          <Btn type="submit" loading={busy} className="w-full">Sign in</Btn>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          New here? <Link to="/register" className="font-semibold text-blue-700 hover:underline">Create an account</Link>
        </p>
      </Card>

      <Card className="mt-6">
        <p className="text-sm font-semibold text-slate-900">Try it without signing up</p>
        <p className="mt-1 text-xs text-slate-500">Demo accounts, each showing a different role.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMOS.map(([label, e, p]) => (
            <Btn key={e} variant="secondary" disabled={busy} onClick={() => go(e, p)}>{label}</Btn>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* -- Register ------------------------------------------------------------ */

const SECTORS = [
  'Education', 'Healthcare', 'Nutrition', 'Women Empowerment',
  'Environment', 'Rural Development', 'Disaster Relief'
];

export function Register() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [role, setRole] = useState<'NGO' | 'DONOR' | 'PUBLIC'>('NGO');
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [account, setAccount] = useState({ name: '', email: '', phone: '', password: '' });
  const [org, setOrg] = useState({
    name: '', regNum: '', pan: '', certificate12A: '', certificate80G: '',
    address: '', state: '', district: '', areaOfWork: 'Education', mission: ''
  });

  const totalSteps = role === 'NGO' ? 2 : 1;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // Organisation details are sent with the account, so nothing entered is lost.
      const body: Record<string, unknown> = { ...account, role };
      if (role === 'NGO') body.organisation = { ...org, name: org.name || account.name };

      const r = await api.post<{ token: string; user: User }>('/auth/register', body);
      token.set(r.token);
      await refresh();
      toast('Your account is ready.', 'success');
      navigate(homeFor(r.user.role), { replace: true });
    } catch (err: any) {
      setError(err.message);
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <H1 sub={role === 'NGO'
        ? 'Two short steps. Everything you enter is saved and sent for verification.'
        : 'One short step and you are done.'}>
        Create an account
      </H1>

      <Card className="mb-6">
        <p className="mb-2 text-sm font-medium text-slate-800">I am…</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ['NGO', 'An organisation', 'Register and get verified'],
            ['DONOR', 'A donor', 'Support verified causes'],
            ['PUBLIC', 'A member of the public', 'Browse and research']
          ] as const).map(([value, title, sub]) => (
            <button key={value} type="button"
              onClick={() => { setRole(value); setStep(1); }}
              aria-pressed={role === value}
              className={`rounded-lg border p-3 text-left transition-colors ${
                role === value ? 'border-blue-700 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'
              }`}>
              <span className="block text-sm font-semibold text-slate-900">{title}</span>
              <span className="block text-xs text-slate-500">{sub}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Step {step} of {totalSteps}
        </p>

        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

        {step === 1 && (
          <form onSubmit={e => {
            e.preventDefault();
            if (role === 'NGO') setStep(2); else submit();
          }} className="space-y-4">
            <Field label={role === 'NGO' ? 'Your name' : 'Full name'}>
              <Input required value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <Input type="email" required autoComplete="email" value={account.email}
                  onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
              </Field>
              <Field label="Phone" hint="Optional">
                <Input value={account.phone} onChange={e => setAccount(a => ({ ...a, phone: e.target.value }))} />
              </Field>
            </div>

            <Field label="Password" hint="At least 8 characters.">
              <Input type="password" required minLength={8} autoComplete="new-password"
                value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} />
            </Field>

            <Btn type="submit" loading={busy && role !== 'NGO'} className="w-full">
              {role === 'NGO' ? 'Next: organisation details' : 'Create account'}
            </Btn>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-4">
            <Field label="Organisation name">
              <Input required value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))}
                placeholder="e.g. Hope Foundation India" />
            </Field>

            <Field label="Registration number" hint="As it appears on your registration certificate. Must be unique.">
              <Input required value={org.regNum} onChange={e => setOrg(o => ({ ...o, regNum: e.target.value }))}
                placeholder="DEL/2018/0019482" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="PAN">
                <Input value={org.pan} onChange={e => setOrg(o => ({ ...o, pan: e.target.value.toUpperCase() }))} placeholder="AAATH1234F" />
              </Field>
              <Field label="12A number">
                <Input value={org.certificate12A} onChange={e => setOrg(o => ({ ...o, certificate12A: e.target.value }))} />
              </Field>
              <Field label="80G number">
                <Input value={org.certificate80G} onChange={e => setOrg(o => ({ ...o, certificate80G: e.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State">
                <Input value={org.state} onChange={e => setOrg(o => ({ ...o, state: e.target.value }))} placeholder="Karnataka" />
              </Field>
              <Field label="District">
                <Input value={org.district} onChange={e => setOrg(o => ({ ...o, district: e.target.value }))} placeholder="Bengaluru" />
              </Field>
            </div>

            <Field label="Main area of work">
              <Select value={org.areaOfWork} onChange={e => setOrg(o => ({ ...o, areaOfWork: e.target.value }))}>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>

            <Field label="What does your organisation do?" hint="One or two sentences. Shown on your public profile.">
              <Textarea rows={3} value={org.mission} onChange={e => setOrg(o => ({ ...o, mission: e.target.value }))} />
            </Field>

            <Alert tone="info">
              After this you will upload your documents and run the government check.
              An auditor reviews everything before your organisation appears publicly.
            </Alert>

            <div className="flex gap-2">
              <Btn type="button" variant="secondary" onClick={() => setStep(1)}>Back</Btn>
              <Btn type="submit" loading={busy} className="flex-1">Create account</Btn>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
