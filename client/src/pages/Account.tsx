import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { api, token, User, validate, INDIAN_STATES, CAUSES } from '../lib/api';
import { Card, H1, H2, Btn, Field, Input, Select, Textarea, Alert, Stepper, useToast } from '../lib/ui';
import { useAuth, homeFor } from '../App';

const DEMOS = [
  ['Admin', 'admin@ngocommons.demo', 'Admin@123'],
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

          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="font-medium text-blue-700 hover:underline">
              Forgot password?
            </Link>
            <Link to="/register" className="font-medium text-blue-700 hover:underline">
              Create an account
            </Link>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <p className="text-sm font-semibold text-slate-900">Try it without signing up</p>
        <p className="mt-1 text-xs text-slate-500">Demo accounts, one per role.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMOS.map(([label, e, p]) => (
            <Btn key={e} variant="secondary" disabled={busy} onClick={() => go(e, p)}>{label}</Btn>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* -- Forgot / reset password --------------------------------------------- */

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ message: string; devResetLink?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSent(await api.post('/auth/forgot-password', { email }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <H1 sub="Enter the email you signed up with and we will send you a link to choose a new password.">
        Forgot your password?
      </H1>

      <Card>
        {sent ? (
          <div className="space-y-4">
            <Alert tone="success">{sent.message}</Alert>
            {sent.devResetLink && (
              <Alert tone="info">
                <p className="font-semibold">Email is not configured on this server.</p>
                <p className="mt-1">Use this link to continue:</p>
                <a href={sent.devResetLink} className="mt-2 block break-all font-mono text-xs text-blue-800 underline">
                  {sent.devResetLink}
                </a>
              </Alert>
            )}
            <Link to="/signin" className="block text-center text-sm font-medium text-blue-700 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="Email">
              <Input type="email" required autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.org" />
            </Field>
            <Btn type="submit" loading={busy} className="w-full">Send reset link</Btn>
            <Link to="/signin" className="block text-center text-sm font-medium text-slate-600 hover:underline">
              Back to sign in
            </Link>
          </form>
        )}
      </Card>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const resetToken = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('The two passwords do not match.'); return; }

    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token: resetToken, newPassword: password });
      toast('Your password has been changed.', 'success');
      navigate('/signin', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="mx-auto max-w-md">
        <H1>Reset your password</H1>
        <Alert tone="error">
          This link is missing its reset code. Please request a new link.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <H1 sub="Choose a new password. It must be at least 8 characters.">Reset your password</H1>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="New password">
            <Input type="password" required minLength={8} autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" required minLength={8} autoComplete="new-password"
              value={confirm} onChange={e => setConfirm(e.target.value)} />
          </Field>
          <Btn type="submit" loading={busy} className="w-full">Save new password</Btn>
        </form>
      </Card>
    </div>
  );
}

/* -- Registration --------------------------------------------------------- */

const NGO_STEPS = ['Organisation', 'Contact', 'Account', 'Causes', 'Review'];

export function Register() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [role, setRole] = useState<'NGO' | 'DONOR' | 'PUBLIC'>('NGO');
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [org, setOrg] = useState({
    name: '', description: '', presidentName: '', regNum: '',
    phone: '', email: '', address: '', city: '', state: '', pinCode: ''
  });
  const [account, setAccount] = useState({ name: '', email: '', phone: '', password: '' });
  const [causes, setCauses] = useState<string[]>([]);

  const toggleCause = (c: string) =>
    setCauses(list => list.includes(c) ? list.filter(x => x !== c) : [...list, c]);

  /** Validates the current step, returning a message when something is wrong. */
  const problemWith = (index: number): string | null => {
    if (role !== 'NGO') {
      if (!account.name.trim()) return 'Please enter your name.';
      if (!validate.email(account.email)) return 'Please enter a valid email address.';
      if (account.password.length < 8) return 'Password must be at least 8 characters.';
      return null;
    }

    if (index === 0) {
      if (!org.name.trim()) return 'Please enter the organisation name.';
      if (org.description.trim().length < 20) return 'Please describe the organisation in at least 20 characters.';
      if (!org.presidentName.trim()) return 'Please enter the name of the head of the organisation.';
      if (!org.regNum.trim()) return 'Please enter the registration number.';
    }

    if (index === 1) {
      if (!validate.phone(org.phone)) return 'Enter a valid 10-digit Indian mobile number.';
      if (!validate.email(org.email)) return 'Enter a valid official email address.';
      if (!org.address.trim()) return 'Please enter the full address.';
      if (!org.city.trim()) return 'Please enter the city.';
      if (!org.state) return 'Please choose a state.';
      if (!validate.pin(org.pinCode)) return 'Enter a valid 6-digit PIN code.';
    }

    if (index === 2) {
      if (!account.name.trim()) return 'Please enter your name.';
      if (!validate.email(account.email)) return 'Please enter a valid email address.';
      if (account.password.length < 8) return 'Password must be at least 8 characters.';
    }

    if (index === 3 && causes.length === 0) return 'Choose at least one cause you work on.';

    return null;
  };

  const next = () => {
    const problem = problemWith(step);
    if (problem) { setError(problem); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const submit = async () => {
    for (let i = 0; i <= 3; i++) {
      const problem = problemWith(i);
      if (problem) { setError(problem); setStep(i); return; }
    }

    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...account, role };
      if (role === 'NGO') {
        body.organisation = { ...org, areaOfWork: causes.join(', '), mission: org.description };
      }

      const r = await api.post<{ token: string; user: User }>('/auth/register', body);
      token.set(r.token);

      // Causes are stored separately, once the account exists.
      if (role === 'NGO' && causes.length) {
        try { await api.put('/causes/mine', { categories: causes }); } catch { /* non-blocking */ }
      }

      await refresh();
      toast('Your account is ready.', 'success');
      navigate(homeFor(r.user.role), { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input = (label: string, key: keyof typeof org, props: Record<string, unknown> = {}, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input value={org[key]} onChange={e => setOrg(o => ({ ...o, [key]: e.target.value }))} {...props} />
    </Field>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <H1 sub={role === 'NGO'
        ? 'Five short steps. Everything you enter is saved and sent for verification.'
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
              onClick={() => { setRole(value); setStep(0); setError(null); }}
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
        {role === 'NGO' && <Stepper steps={NGO_STEPS} current={step} />}

        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

        {/* Non-NGO roles need only an account. */}
        {role !== 'NGO' && (
          <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-4">
            <Field label="Full name">
              <Input required value={account.name}
                onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <Input type="email" required autoComplete="email" value={account.email}
                  onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
              </Field>
              <Field label="Phone" hint="Optional">
                <Input value={account.phone}
                  onChange={e => setAccount(a => ({ ...a, phone: e.target.value }))} />
              </Field>
            </div>
            <Field label="Password" hint="At least 8 characters.">
              <Input type="password" required minLength={8} autoComplete="new-password"
                value={account.password}
                onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} />
            </Field>
            <Btn type="submit" loading={busy} className="w-full">Create account</Btn>
          </form>
        )}

        {/* Step 1 — organisation */}
        {role === 'NGO' && step === 0 && (
          <div className="space-y-4">
            <H2>About your organisation</H2>
            {input('Organisation name', 'name', { required: true, placeholder: 'e.g. Hope Foundation India' })}
            <Field label="What does your organisation do?" hint="At least 20 characters. This appears on your public profile.">
              <Textarea rows={3} value={org.description}
                onChange={e => setOrg(o => ({ ...o, description: e.target.value }))}
                placeholder="We run after-school learning centres for children of daily-wage workers…" />
            </Field>
            {input('Adhyaksha / President / Head', 'presidentName', { placeholder: 'e.g. Dr. Ramesh Patil' })}
            {input('Registration number', 'regNum', { placeholder: 'DEL/2018/0019482' },
              'As printed on your registration certificate. Must be unique.')}
            <div className="flex justify-end"><Btn onClick={next}>Continue</Btn></div>
          </div>
        )}

        {/* Step 2 — contact */}
        {role === 'NGO' && step === 1 && (
          <div className="space-y-4">
            <H2>Contact details</H2>
            <div className="grid gap-4 sm:grid-cols-2">
              {input('Official phone', 'phone', { placeholder: '9876543210', inputMode: 'numeric' }, '10 digits')}
              {input('Official email', 'email', { type: 'email', placeholder: 'contact@yourngo.org' })}
            </div>
            <Field label="Complete address">
              <Textarea rows={2} value={org.address}
                onChange={e => setOrg(o => ({ ...o, address: e.target.value }))}
                placeholder="Building, street, area" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              {input('City', 'city', { placeholder: 'Bengaluru' })}
              <Field label="State">
                <Select value={org.state} onChange={e => setOrg(o => ({ ...o, state: e.target.value }))}>
                  <option value="">Choose…</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              {input('PIN code', 'pinCode', { placeholder: '560038', inputMode: 'numeric' })}
            </div>
            <div className="flex justify-between">
              <Btn variant="secondary" onClick={() => { setError(null); setStep(0); }}>Back</Btn>
              <Btn onClick={next}>Continue</Btn>
            </div>
          </div>
        )}

        {/* Step 3 — login account */}
        {role === 'NGO' && step === 2 && (
          <div className="space-y-4">
            <H2>Your login</H2>
            <p className="text-sm text-slate-600">
              This is the account you will sign in with to manage the organisation.
            </p>
            <Field label="Your name">
              <Input required value={account.name}
                onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <Input type="email" required autoComplete="email" value={account.email}
                  onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
              </Field>
              <Field label="Phone" hint="Optional">
                <Input value={account.phone}
                  onChange={e => setAccount(a => ({ ...a, phone: e.target.value }))} />
              </Field>
            </div>
            <Field label="Password" hint="At least 8 characters.">
              <Input type="password" required minLength={8} autoComplete="new-password"
                value={account.password}
                onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} />
            </Field>
            <div className="flex justify-between">
              <Btn variant="secondary" onClick={() => { setError(null); setStep(1); }}>Back</Btn>
              <Btn onClick={next}>Continue</Btn>
            </div>
          </div>
        )}

        {/* Step 4 — causes */}
        {role === 'NGO' && step === 3 && (
          <div className="space-y-4">
            <H2>What do you work on?</H2>
            <p className="text-sm text-slate-600">Choose everything that applies. Donors browse by these.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CAUSES.map(c => (
                <button key={c} type="button" onClick={() => toggleCause(c)}
                  aria-pressed={causes.includes(c)}
                  className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    causes.includes(c)
                      ? 'border-blue-700 bg-blue-50 text-blue-900'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}>
                  {causes.includes(c) ? '✓ ' : ''}{c}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Btn variant="secondary" onClick={() => { setError(null); setStep(2); }}>Back</Btn>
              <Btn onClick={next}>Continue</Btn>
            </div>
          </div>
        )}

        {/* Step 5 — review */}
        {role === 'NGO' && step === 4 && (
          <div className="space-y-4">
            <H2>Check and submit</H2>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {[
                ['Organisation', org.name],
                ['Head of organisation', org.presidentName],
                ['Registration number', org.regNum],
                ['Phone', org.phone],
                ['Email', org.email],
                ['Address', `${org.address}, ${org.city}, ${org.state} ${org.pinCode}`],
                ['Causes', causes.join(', ')],
                ['Login email', account.email]
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="max-w-[60%] text-right font-medium text-slate-900">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            <Alert tone="info">
              After this you will upload your documents and add your UPI details.
              An admin reviews everything before your organisation appears publicly.
            </Alert>

            <div className="flex justify-between">
              <Btn variant="secondary" onClick={() => { setError(null); setStep(3); }}>Back</Btn>
              <Btn onClick={submit} loading={busy}>Submit registration</Btn>
            </div>
          </div>
        )}
      </Card>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already registered? <Link to="/signin" className="font-medium text-blue-700 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
