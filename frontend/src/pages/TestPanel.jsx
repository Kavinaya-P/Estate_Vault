import { useState, useEffect } from 'react';
import { testAPI, deadmanAPI, nomineesAPI } from '../utils/api';
import { Alert } from '../components/UI';

const TESTS = [
  {
    id: 'warning',
    label: 'Simulate Warning State',
    desc: 'Sets dead man switch to 26 days inactive. Sends warning email to vault owner (4 days left).',
    icon: '!',
    color: '#e8c96a',
    run: () => testAPI.simulateWarning(),
  },
  {
    id: 'trigger',
    label: 'Simulate Trigger (30+ days)',
    desc: 'Sets switch as triggered. Sends notification emails to all accepted nominees. Opens 72h contest window.',
    icon: 'X',
    color: '#c45555',
    run: () => testAPI.simulateTrigger(),
  },
  {
    id: 'reset',
    label: 'Full Reset All Test State',
    desc: 'Resets dead man switch to clean state: 30 day window, no warnings, no triggers.',
    icon: 'R',
    color: 'var(--gold)',
    run: () => testAPI.reset(),
  },
];

function TestCard({ test, onDone }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await test.run();
      setResult({ ok: true, data: res.data });
    } catch (err) {
      setResult({ ok: false, error: err.response?.data?.error || err.message });
    }
    setLoading(false);
    if (onDone) onDone();
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, padding: 20, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>{test.icon}</span>
            <span style={{ fontSize: 13, color: test.color, fontWeight: 500 }}>{test.label}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{test.desc}</div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: `1px solid ${loading ? 'var(--border)' : test.color}`,
            borderRadius: 2,
            color: loading ? 'var(--muted)' : test.color,
            fontSize: 10,
            cursor: loading ? 'default' : 'pointer',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            opacity: loading ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Running...' : 'Run >'}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 14,
            background: result.ok ? 'rgba(76,175,125,0.05)' : 'rgba(196,85,85,0.05)',
            border: `1px solid ${result.ok ? 'rgba(76,175,125,0.25)' : 'rgba(196,85,85,0.25)'}`,
            borderRadius: 2,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: result.ok ? '#4caf7d' : '#c45555',
              marginBottom: 8,
            }}
          >
            {result.ok ? 'Success' : 'Failed'}
          </div>
          <pre
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
              lineHeight: 1.6,
              fontFamily: 'monospace',
            }}
          >
            {JSON.stringify(result.ok ? result.data : { error: result.error }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function TestPanel() {
  const [status, setStatus] = useState(null);
  const [nominees, setNominees] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLA] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadStatus = async () => {
    try {
      const [ds, nm] = await Promise.all([deadmanAPI.getStatus(), nomineesAPI.getNominees()]);
      setStatus(ds.data.deadman);
      setNominees(nm.data.nominees);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load. Make sure you are logged in.' });
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const loadAudit = async () => {
    setLA(true);
    try {
      const r = await testAPI.getAuditLog();
      setAuditLog(r.data.logs);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load audit log.' });
    }
    setLA(false);
  };

  const sc = () => {
    if (!status) return 'var(--muted)';
    if (status.triggered) return '#c45555';
    if (status.isOverdue) return '#c45555';
    if (status.daysUntilDue <= 5) return '#e8c96a';
    return '#4caf7d';
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'var(--bright)' }}>
            Test Panel
          </div>
          <span
            style={{
              padding: '4px 10px',
              background: 'rgba(196,85,85,0.1)',
              border: '1px solid rgba(196,85,85,0.3)',
              borderRadius: 2,
              fontSize: 9,
              color: '#c45555',
              letterSpacing: '0.2em',
            }}
          >
            DEV ONLY
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', lineHeight: 1.6 }}>
          Simulate scenarios without waiting for real timers. All actions show API responses.
        </div>
      </div>

      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--card)', border: `1px solid ${sc()}`, borderRadius: 2, padding: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Dead Man's Switch
          </div>
          {status ? (
            <>
              <div style={{ fontSize: 26, fontFamily: "'Cormorant Garamond', serif", color: sc(), marginBottom: 14 }}>
                {status.triggered ? 'TRIGGERED' : status.isOverdue ? 'OVERDUE' : status.warningSent ? 'WARNING' : 'Active'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  ['Days left', status.daysUntilDue],
                  ['Interval', `${status.checkIntervalDays}d`],
                  ['Misses', status.consecutiveMisses],
                  ['Warning', status.warningSent ? 'Yes' : 'No'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: 15, color: 'var(--bright)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {status.triggered && status.contestDeadline && (
                <div style={{ padding: '8px 10px', background: 'rgba(232,169,48,0.08)', border: '1px solid rgba(232,169,48,0.3)', borderRadius: 2, fontSize: 10, color: '#e8c96a' }}>
                  Contest window: {status.contestHoursLeft}h left
                </div>
              )}
              <button
                onClick={loadStatus}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '7px 0',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  color: 'var(--muted)',
                  fontSize: 9,
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  fontFamily: 'inherit',
                }}
              >
                Refresh Status
              </button>
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Loading...</div>
          )}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, padding: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Nominees ({nominees.length})
          </div>
          {nominees.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
              No nominees yet.
              <br />
              <a href="/nominees" style={{ color: 'var(--gold)', fontSize: 11 }}>
                -> Add nominees first
              </a>
            </div>
          ) : (
            nominees.map((n) => (
              <div key={n._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--bright)' }}>{n.fullName}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {n.email} - Priority {n.priorityLevel}
                  </div>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 2,
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: n.status === 'accepted' ? '#4caf7d' : n.status === 'declined' ? '#c45555' : '#e8c96a',
                    background: n.status === 'accepted' ? 'rgba(76,175,125,0.1)' : n.status === 'declined' ? 'rgba(196,85,85,0.1)' : 'rgba(232,169,48,0.1)',
                    border: `1px solid ${n.status === 'accepted' ? 'rgba(76,175,125,0.3)' : n.status === 'declined' ? 'rgba(196,85,85,0.3)' : 'rgba(232,169,48,0.3)'}`,
                  }}
                >
                  {n.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14 }}>
          Test Scenarios
        </div>
        {TESTS.map((t) => (
          <TestCard key={t.id} test={t} onDone={loadStatus} />
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Audit Log</div>
          <button
            onClick={loadAudit}
            disabled={loadingAudit}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid var(--border2)',
              borderRadius: 2,
              color: 'var(--muted)',
              fontSize: 9,
              cursor: 'pointer',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            {loadingAudit ? 'Loading...' : 'Load Logs'}
          </button>
        </div>
        {auditLog.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, maxHeight: 380, overflow: 'auto' }}>
            {auditLog.map((log, i) => (
              <div key={log._id || i} style={{ padding: '10px 16px', borderBottom: i < auditLog.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 140 }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                <div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: log.severity === 'critical' ? '#c45555' : log.severity === 'warning' ? '#e8c96a' : '#4caf7d' }}>
                    {log.action}
                  </span>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 10 }}>{JSON.stringify(log.metadata)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
