import { useState, useEffect } from 'react';
import { deadmanAPI } from '../utils/api';
import { Alert, PrimaryButton } from '../components/UI';

export default function DeadmanSwitch() {
  const [status, setStatus]      = useState(null);
  const [loading, setLoading]    = useState(true);
  const [checking, setChecking]  = useState(false);
  const [alert, setAlert]        = useState(null);
  const [interval, setInterval2] = useState(30);

  const load = async () => {
    try {
      const res = await deadmanAPI.getStatus();
      setStatus(res.data.deadman);
      setInterval2(res.data.deadman.checkIntervalDays);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load dead man switch status.' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCheckin = async () => {
    setChecking(true); setAlert(null);
    try {
      const res = await deadmanAPI.confirmCheckin();
      await load();
      setAlert({ type: 'success', msg: res.data.message });
    } catch {
      setAlert({ type: 'error', msg: 'Check-in failed.' });
    }
    setChecking(false);
  };

  const handleIntervalUpdate = async () => {
    try {
      await deadmanAPI.updateInterval(interval);
      await load();
      setAlert({ type: 'success', msg: `Interval updated to ${interval} days.` });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to update interval.' });
    }
  };

  const getColor = () => {
    if (!status) return 'var(--muted)';
    if (status.triggered) return 'var(--red, #c45555)';
    if (status.isOverdue) return 'var(--red, #c45555)';
    if (status.daysUntilDue <= 5) return '#e8a030';
    return 'var(--green, #4caf7d)';
  };

  const getPct = () => {
    if (!status) return 0;
    return Math.min(100, Math.round(((status.checkIntervalDays - status.daysUntilDue) / status.checkIntervalDays) * 100));
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'var(--bright)' }}>Dead Man's Switch</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, letterSpacing: '0.08em', lineHeight: 1.6 }}>
          Confirm you're alive every {status?.checkIntervalDays || 30} days. Missing check-ins triggers nominee notification.
        </div>
      </div>

      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

      {status && (
        <div style={{ background: 'var(--card)', border: `1px solid ${getColor()}`, borderRadius: 2, padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Status</div>
              <div style={{ fontSize: 28, fontFamily: "'Cormorant Garamond', serif", color: getColor() }}>
                {status.triggered ? 'TRIGGERED' : status.isOverdue ? 'OVERDUE' : status.warningSent ? 'WARNING SENT' : 'Active'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Days remaining</div>
              <div style={{ fontSize: 42, fontFamily: "'Cormorant Garamond', serif", color: getColor(), lineHeight: 1 }}>
                {status.daysUntilDue}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${getPct()}%`, background: getColor(), transition: 'width 0.5s ease', borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--muted)' }}>
              <span>Last check-in: {new Date(status.lastConfirmed).toLocaleDateString()}</span>
              <span>Due: {new Date(status.nextCheckDue).toLocaleDateString()}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {[
              ['Interval', `${status.checkIntervalDays} days`],
              ['Missed Check-ins', status.consecutiveMisses],
              ['Warning Sent', status.warningSent ? 'Yes' : 'No'],
            ].map(([label, val]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, color: 'var(--bright)' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* 72h Contest Window Alert */}
          {status.triggered && status.contestDeadline && !status.contestCancelled && (
            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(232,169,48,0.08)', border: '1px solid rgba(232,169,48,0.4)', borderRadius: 2 }}>
              <div style={{ fontSize: 12, color: '#e8c96a', marginBottom: 4, fontWeight: 500 }}>⏳ Contest Window Active — {status.contestHoursLeft}h remaining</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
                Your switch was triggered. Check in below within the contest window to cancel this alert before nominees can submit a death certificate.
              </div>
            </div>
          )}

          <PrimaryButton onClick={handleCheckin} loading={checking} loadingText="Confirming...">
            ✓ I'm Alive — Confirm Check-in
          </PrimaryButton>
        </div>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, padding: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Check-in Interval</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          How often you need to confirm you're alive. Minimum 7 days, maximum 365 days.
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="number" min={7} max={365} value={interval} onChange={e => setInterval2(parseInt(e.target.value))}
            style={{ width: 80, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, padding: '10px 12px', fontSize: 14, color: 'var(--bright)', outline: 'none', fontFamily: 'inherit' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>days</span>
          <button onClick={handleIntervalUpdate}
            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 2, color: 'var(--text)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
            Update
          </button>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setInterval2(d)}
              style={{ padding: '6px 12px', background: interval === d ? 'rgba(201,168,76,0.15)' : 'var(--surface)', border: `1px solid ${interval === d ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 2, color: interval === d ? 'var(--gold)' : 'var(--muted)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
