import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminDeathAPI } from '../utils/api';
import { Alert, PageLoader } from '../components/UI';
import { AdminLayout } from '../components/Layout';

const STATUS_COLORS = {
  pending:      { bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.3)', color: '#e8c96a' },
  under_review: { bg: 'rgba(100,130,220,0.1)', border: 'rgba(100,130,220,0.3)', color: '#8899ee' },
  approved:     { bg: 'rgba(76,175,125,0.1)', border: 'rgba(76,175,125,0.3)', color: '#4caf7d' },
  rejected:     { bg: 'rgba(196,85,85,0.1)',  border: 'rgba(196,85,85,0.3)',  color: '#c45555' },
};

// Download certificate with auth token
const downloadCertificate = async (filename) => {
  try {
    const token = localStorage.getItem('ev_admin_token');
    const res = await fetch(`/api/admin/death/certificate/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Failed to download certificate. Make sure you are logged in as admin.'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Download failed: ' + err.message);
  }
};

const InfoRow = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12 }}>
    <span style={{ color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10 }}>{label}</span>
    <span style={{ color: color || 'var(--bright)' }}>{value}</span>
  </div>
);

const RequestCard = ({ request, onSelect }) => {
  const s = STATUS_COLORS[request.status] || {};
  return (
    <div onClick={onSelect}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, padding: '16px 20px', marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div>
        <div style={{ fontSize: 13, color: 'var(--bright)', marginBottom: 4 }}>
          {request.userId?.fullName || 'Unknown'}
          <span style={{ color: 'var(--muted)', fontSize: 11 }}> — submitted by {request.requestedByEmail}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(request.createdAt).toLocaleString()}</div>
      </div>
      <div style={{ padding: '4px 10px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 2, fontSize: 10, color: s.color, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {request.status.replace('_', ' ')}
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes]       = useState('');
  const [acting, setActing]     = useState(false);
  const [alert, setAlert]       = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('ev_admin_token')) navigate('/admin/login');
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminDeathAPI.getAllRequests();
      setRequests(res.data.requests);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate('/admin/login');
      else setAlert({ type: 'error', msg: 'Failed to load requests.' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this request? This will unlock the vault and mark the user as deceased. This cannot be undone.')) return;
    setActing(true);
    try {
      await adminDeathAPI.approveRequest(id, notes);
      setNotes(''); await load(); setSelected(null);
      setAlert({ type: 'success', msg: 'Approved. Vault unlocked, nominee notified, and scheduled messages delivered.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Approval failed.' });
    }
    setActing(false);
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this request? The nominee will be notified by email.')) return;
    setActing(true);
    try {
      await adminDeathAPI.rejectRequest(id, notes);
      setNotes(''); await load(); setSelected(null);
      setAlert({ type: 'info', msg: 'Rejected. Nominee notified by email.' });
    } catch {
      setAlert({ type: 'error', msg: 'Rejection failed.' });
    }
    setActing(false);
  };

  const pending  = requests.filter(r => ['pending', 'under_review'].includes(r.status));
  const reviewed = requests.filter(r => ['approved', 'rejected'].includes(r.status));

  return (
    <AdminLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'var(--bright)' }}>Death Verification</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, letterSpacing: '0.08em' }}>
            Review death certificate submissions — all decisions trigger email notifications
          </div>
        </div>

        {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            ['Total',    requests.length,                                        'var(--text)'],
            ['Pending',  requests.filter(r => r.status === 'pending').length,    '#e8c96a'],
            ['Approved', requests.filter(r => r.status === 'approved').length,   '#4caf7d'],
            ['Rejected', requests.filter(r => r.status === 'rejected').length,   '#c45555'],
          ].map(([label, count, color]) => (
            <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontFamily: "'Cormorant Garamond', serif", color }}>{count}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {loading ? <PageLoader /> : (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Requires Action ({pending.length})
                </div>
                {pending.map(r => <RequestCard key={r._id} request={r} onSelect={() => { setSelected(r); setNotes(''); }} />)}
              </div>
            )}
            {reviewed.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Reviewed</div>
                {reviewed.map(r => <RequestCard key={r._id} request={r} onSelect={() => { setSelected(r); setNotes(''); }} />)}
              </div>
            )}
            {requests.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 2 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: 'var(--bright)', marginBottom: 8 }}>No requests yet</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                  Death certificate submissions will appear here.<br />
                  Nominees submit via: <span style={{ color: 'var(--gold)' }}>localhost:3000/nominee-portal</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail modal */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 2, padding: 32, maxWidth: 580, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--bright)' }}>Request Details</div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>

              <InfoRow label="Vault Owner"   value={selected.userId?.fullName || '—'} />
              <InfoRow label="Owner Email"   value={selected.userId?.email || '—'} />
              <InfoRow label="Requested By"  value={selected.requestedByEmail} />
              <InfoRow label="Nominee Name"  value={selected.requestedByNomineeId?.fullName || '—'} />
              <InfoRow label="Priority"      value={selected.requestedByNomineeId?.priorityLevel === 1 ? 'Primary' : 'Secondary'} />
              <InfoRow label="Submitted"     value={new Date(selected.createdAt).toLocaleString()} />
              <InfoRow label="Status"        value={selected.status.replace('_', ' ').toUpperCase()} color={STATUS_COLORS[selected.status]?.color} />

              {selected.certificateFileName && (
                <div style={{ margin: '16px 0' }}>
                  <button onClick={() => downloadCertificate(selected.certificateFileName)}
                    style={{ padding: '10px 18px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 2, color: 'var(--gold)', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'inherit' }}>
                    📄 Download Death Certificate
                  </button>
                </div>
              )}

              {['pending', 'under_review'].includes(selected.status) && (
                <div style={{ marginTop: 24 }}>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                    Admin Notes (sent to nominee via email)
                  </label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes to include in the notification email..."
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, padding: '10px 12px', color: 'var(--bright)', fontSize: 12, minHeight: 80, resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: 16, boxSizing: 'border-box' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button onClick={() => handleApprove(selected._id)} disabled={acting}
                      style={{ padding: 14, background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.4)', borderRadius: 2, color: '#4caf7d', fontSize: 11, cursor: acting ? 'default' : 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: acting ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {acting ? 'Processing...' : '✓ Approve & Unlock Vault'}
                    </button>
                    <button onClick={() => handleReject(selected._id)} disabled={acting}
                      style={{ padding: 14, background: 'rgba(196,85,85,0.1)', border: '1px solid rgba(196,85,85,0.4)', borderRadius: 2, color: '#c45555', fontSize: 11, cursor: acting ? 'default' : 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: acting ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {acting ? 'Processing...' : '✕ Reject Request'}
                    </button>
                  </div>
                </div>
              )}

              {selected.adminNotes && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--surface)', borderRadius: 2, fontSize: 12, color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--text)' }}>Admin notes:</strong> {selected.adminNotes}
                </div>
              )}
              {selected.reviewedAt && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                  Reviewed: {new Date(selected.reviewedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
