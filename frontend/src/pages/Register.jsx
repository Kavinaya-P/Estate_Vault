import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Brand, Card, Input, PrimaryButton, Alert } from '../components/UI';

// ── Step 1: Registration form
function RegisterForm({ onSuccess }) {
  const [form, setForm]     = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [alert, setAlert]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow]     = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setAlert(null);
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      return setAlert({ type: 'error', msg: 'All fields are required.' });
    }
    if (form.password !== form.confirm) {
      return setAlert({ type: 'error', msg: 'Passwords do not match.' });
    }
    setLoading(true);
    try {
      const res = await authAPI.register({ fullName: form.fullName, email: form.email, password: form.password });
      onSuccess(res.data.userId, form.email);
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Registration failed.' });
    }
    setLoading(false);
  };

  return (
    <>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: 'var(--bright)', marginBottom: 6 }}>Create Account</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 28, lineHeight: 1.7 }}>
        Protect your digital legacy for those who matter
      </div>

      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

      <Input id="reg-name" label="Full Name" value={form.fullName} onChange={set('fullName')} placeholder="Your full name" autoFocus />
      <Input id="reg-email" label="Email Address" type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" />
      <Input id="reg-pass" label="Password" type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Min. 12 characters" />

      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12, marginTop: -10, lineHeight: 1.6 }}>
        Must include uppercase, lowercase, number &amp; special character
      </div>

      <Input id="reg-confirm" label="Confirm Password" type={show ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" />

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)', cursor: 'pointer', marginBottom: 8 }}>
        <input type="checkbox" checked={show} onChange={() => setShow(s => !s)} style={{ accentColor: 'var(--gold)' }} />
        Show passwords
      </label>

      <PrimaryButton onClick={handleSubmit} loading={loading} loadingText="Creating account...">
        Create Account
      </PrimaryButton>

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--muted)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign in</Link>
      </div>
    </>
  );
}

// ── Step 2: Email OTP verification
function VerifyEmailStep({ userId, email, onSuccess }) {
  const [otp, setOtp]       = useState('');
  const [alert, setAlert]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.trim().length !== 6) return setAlert({ type: 'error', msg: 'Enter all 6 digits.' });
    setAlert(null);
    setLoading(true);
    try {
      const res = await authAPI.verifyEmail(userId, otp.trim());
      onSuccess(res.data);
    } catch (err) {
      setOtp('');
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Invalid code. Try again.' });
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setAlert(null);
    try {
      await authAPI.resendVerification(userId);
      setAlert({ type: 'success', msg: 'New code sent to your email.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to resend.' });
    }
    setResending(false);
  };

  // OTP boxes
  const vals = otp.padEnd(6, ' ').split('').slice(0, 6);
  const handleDigit = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const arr = [...vals]; arr[i] = v || ' ';
    const joined = arr.join('').trimEnd();
    setOtp(joined);
    if (v && i < 5) document.getElementById(`reg-otp-${i + 1}`)?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && vals[i] === ' ' && i > 0) document.getElementById(`reg-otp-${i - 1}`)?.focus();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    setOtp(p);
    document.getElementById(`reg-otp-${Math.min(p.length, 5)}`)?.focus();
  };

  return (
    <>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: 'var(--bright)', marginBottom: 6 }}>Verify Your Email</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8, lineHeight: 1.7 }}>
        We sent a 6-digit code to
      </div>
      <div style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 28, letterSpacing: '0.05em' }}>{email}</div>

      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '0 0 28px 0' }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = vals[i] && vals[i] !== ' ';
          return (
            <input key={i} id={`reg-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
              value={filled ? vals[i] : ''}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
              style={{ width: 46, height: 58, textAlign: 'center', fontSize: 22, fontWeight: 700, background: '#111118', border: `1px solid ${filled ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 4, color: 'var(--gold)', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => { e.target.style.borderColor = filled ? 'var(--gold)' : 'var(--border)'; }}
            />
          );
        })}
      </div>

      <PrimaryButton onClick={handleVerify} loading={loading} loadingText="Verifying..." disabled={otp.trim().length !== 6}>
        Verify &amp; Activate Account
      </PrimaryButton>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--muted)' }}>
        Didn't receive it?{' '}
        <button onClick={handleResend} disabled={resending}
          style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
          {resending ? 'Sending...' : 'Resend code'}
        </button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
        Code expires in 10 minutes
      </div>
    </>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const [step, setStep]   = useState(1); // 1 = form, 2 = verify
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState('');

  const handleRegistered = (uid, em) => {
    setUserId(uid);
    setEmail(em);
    setStep(2);
  };

  const handleVerified = (data) => {
    // Save session in context + localStorage
    saveSession(data.token, data.user);
    navigate('/vault');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Brand />

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${s <= step ? 'var(--gold)' : 'var(--border)'}`,
                background: s < step ? 'var(--gold)' : 'transparent',
                color: s < step ? '#0a0a0b' : s === step ? 'var(--gold)' : 'var(--muted)',
                fontSize: 11, fontWeight: 700,
              }}>{s < step ? '✓' : s}</div>
              {s < 2 && <div style={{ width: 40, height: 1, background: s < step ? 'var(--gold)' : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <Card>
          <div style={{ padding: 32 }}>
            {step === 1 && <RegisterForm onSuccess={handleRegistered} />}
            {step === 2 && <VerifyEmailStep userId={userId} email={email} onSuccess={handleVerified} />}
          </div>
        </Card>
      </div>
    </div>
  );
}
