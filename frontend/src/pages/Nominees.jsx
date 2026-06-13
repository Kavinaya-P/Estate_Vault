import { useState, useEffect } from 'react';
import { nomineesAPI } from '../utils/api';
import { Alert, PrimaryButton, Input } from '../components/UI';

const STATUS_STYLE = {
  pending:  { color: '#e8c96a', bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.3)'  },
  accepted: { color: '#4caf7d', bg: 'rgba(76,175,125,0.1)', border: 'rgba(76,175,125,0.3)' },
  declined: { color: '#c45555', bg: 'rgba(196,85,85,0.1)',  border: 'rgba(196,85,85,0.3)'  },
  inactive: { color: 'var(--muted)', bg: 'transparent', border: 'var(--border)' },
};

const emptyForm = { fullName: '', email: '', relationship: '', phone: '', priorityLevel: 1 };

export default function Nominees() {
  const [nominees, setNominees] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [alert, setAlert]       = useState(null);

  const load = async () => {
    try {
      const res = await nomineesAPI.getNominees();
      setNominees(res.data.nominees);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load nominees.' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleAdd = async () => {
    if (!form.fullName || !form.email) return setAlert({ type: 'error', msg: 'Full name and email are required.' });
    setSaving(true); setAlert(null);
    try {
      await nomineesAPI.addNominee({ ...form, priorityLevel: parseInt(form.priorityLevel) });
      setForm(emptyForm); setAdding(false); await load();
      setAlert({ type: 'success', msg: 'Nominee added. Invitation email sent to them.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to add nominee.' });
    }
    setSaving(false);
  };

  const handleResend = async (id) => {
    try {
      await nomineesAPI.resendInvitation(id);
      setAlert({ type: 'success', msg: 'Invitation resent.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to resend.' });
    }
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name} as a nominee?`)) return;
    try {
      await nomineesAPI.removeNominee(id);
      await load();
      setAlert({ type: 'success', msg: 'Nominee removed.' });
    } catch {
      setAlert({ type: 'error', msg: 'Failed to remove nominee.' });
    }
  };

  const hasPrimary   = nominees.some(n => n.priorityLevel === 1);
  const hasSecondary = nominees.some(n => n.priorityLevel === 2);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>

      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'var(--bright)' }}>Nominees</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, letterSpacing: '0.08em', lineHeight: 1.6 }}>
            Add up to 2 nominees — one primary and one secondary. They must accept the invitation before they can act.
          </div>
        </div>
        {!adding && nominees.length < 2 && (
          <button onClick={() => { setAdding(true); setAlert(null); setForm({ ...emptyForm, priorityLevel: hasPrimary ? 2 : 1 }); }}
            style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--gold)', borderRadius: 2, color: 'var(--gold)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            + Add Nominee
          </button>
        )}
      </div>

      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

      {/* Add form */}
      {adding && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 2, padding: 28, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>New Nominee</div>
          <Input id="n-name" label="Full Name *" value={form.fullName} onChange={set('fullName')} placeholder="Their full name" autoFocus />
          <Input id="n-email" label="Email Address *" type="email" value={form.email} onChange={set('email')} placeholder="their@email.com" />
          <Input id="n-rel" label="Relationship" value={form.relationship} onChange={set('relationship')} placeholder="Spouse, Child, Friend..." />
          <Input id="n-phone" label="Phone (optional)" value={form.phone} onChange={set('phone')} placeholder="+91 99999 00000" />

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Priority Level</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { val: 1, label: 'Primary', disabled: hasPrimary },
                { val: 2, label: 'Secondary', disabled: hasSecondary },
              ].map(({ val, label, disabled }) => (
                <button key={val} onClick={() => !disabled && setForm(f => ({ ...f, priorityLevel: val }))} disabled={disabled}
                  style={{ flex: 1, padding: '10px 0', background: form.priorityLevel === val ? 'rgba(201,168,76,0.1)' : 'var(--surface)', border: `1px solid ${form.priorityLevel === val ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 2, color: disabled ? 'var(--muted)' : form.priorityLevel === val ? 'var(--gold)' : 'var(--text)', fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit', letterSpacing: '0.1em' }}>
                  {label} {disabled ? '(taken)' : ''}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <PrimaryButton onClick={handleAdd} loading={saving} loadingText="Adding...">Add Nominee</PrimaryButton>
            <button onClick={() => { setAdding(false); setAlert(null); }}
              style={{ padding: '12px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--muted)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Nominee list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : nominees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 2 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--bright)', marginBottom: 8 }}>No nominees yet</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
            Add a primary nominee who will be notified if you stop checking in.<br />
            They will receive an invitation email to accept the nomination.
          </div>
        </div>
      ) : nominees.map(n => {
        const s = STATUS_STYLE[n.status] || STATUS_STYLE.inactive;
        return (
          <div key={n._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, padding: '20px 24px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontSize: 16, color: 'var(--bright)', fontWeight: 500 }}>{n.fullName}</div>
                  <span style={{ padding: '2px 8px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 2, fontSize: 9, color: s.color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {n.status}
                  </span>
                  <span style={{ padding: '2px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em' }}>
                    {n.priorityLevel === 1 ? 'Primary' : 'Secondary'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                  {n.email}
                  {n.relationship && <span> · {n.relationship}</span>}
                  {n.phone && <span> · {n.phone}</span>}
                </div>
                {n.status === 'pending' && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#e8c96a' }}>
                    ⏳ Waiting for them to accept the invitation email.
                  </div>
                )}
                {n.status === 'accepted' && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#4caf7d' }}>
                    ✓ Active nominee — will be notified if your dead man's switch triggers.
                  </div>
                )}
                {n.status === 'declined' && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#c45555' }}>
                    ✕ Declined invitation. Resend to try again.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                {(n.status === 'pending' || n.status === 'declined') && (
                  <button onClick={() => handleResend(n._id)}
                    style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 2, color: 'var(--muted)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'inherit' }}>
                    Resend
                  </button>
                )}
                <button onClick={() => handleRemove(n._id, n.fullName)}
                  style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(196,85,85,0.3)', borderRadius: 2, color: '#c45555', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'inherit' }}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
