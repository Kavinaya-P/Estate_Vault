import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deathAPI } from '../utils/api';
import { Brand, Card, Alert, PrimaryButton } from '../components/UI';

export default function NomineePortal() {
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('token') || '';
  const ownerFromUrl = params.get('owner') || '';

  const [step, setStep] = useState('form'); // form | submitted | status | vault
  const [nomineeToken, setToken] = useState(tokenFromUrl);
  const [ownerEmail, setOwnerEmail] = useState(ownerFromUrl);
  const [file, setFile] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [vaultData, setVaultData] = useState(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!tokenFromUrl || !ownerFromUrl) return;
      await checkStatus(tokenFromUrl, ownerFromUrl);
    };
    init();
  }, []);

  const checkStatus = async (tok, owner) => {
    setAlert(null);
    try {
      const res = await deathAPI.getNomineeRequestStatus(tok, owner);
      const request = res.data.request;
      if (!request) {
        setRequestStatus(null);
        setStep('form');
        return;
      }
      setRequestStatus(request);
      if (request.status === 'approved') {
        await loadVault(tok, owner);
      } else {
        setStep('status');
      }
    } catch (err) {
      setStep('form');
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Unable to check request status.' });
    }
  };

  const loadVault = async (tok, owner) => {
    setLoadingVault(true);
    setAlert(null);
    try {
      const res = await deathAPI.getVaultAccess(tok, owner);
      setVaultData(res.data);
      setStep('vault');
    } catch (err) {
      setStep('status');
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Vault is not accessible yet.' });
    }
    setLoadingVault(false);
  };

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(f.type)) return setAlert({ type: 'error', msg: 'Only PDF, JPG, or PNG files are accepted.' });
    if (f.size > 10 * 1024 * 1024) return setAlert({ type: 'error', msg: 'File must be under 10MB.' });
    setFile(f);
    setAlert(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!nomineeToken.trim()) return setAlert({ type: 'error', msg: 'Nominee token is required.' });
    if (!ownerEmail.trim()) return setAlert({ type: 'error', msg: 'Vault owner email is required.' });
    if (!file) return setAlert({ type: 'error', msg: 'Please attach the death certificate.' });

    setAlert(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('nomineeToken', nomineeToken.trim());
    formData.append('vaultOwnerEmail', ownerEmail.trim());
    formData.append('certificate', file);

    try {
      await deathAPI.submitDeathRequest(formData);
      setStep('submitted');
      setRequestStatus({ status: 'pending', submittedAt: new Date().toISOString(), adminNotes: null });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Submission failed. Please check your details.' });
    }
    setLoading(false);
  };

  const statusColors = {
    pending: { color: '#e8c96a', label: 'Pending Review', icon: '⏳' },
    under_review: { color: '#8899ee', label: 'Under Review', icon: '🔍' },
    approved: { color: '#4caf7d', label: 'Approved', icon: '✅' },
    rejected: { color: '#c45555', label: 'Rejected', icon: '❌' },
  };

  const renderValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  };

  const renderAssetRows = (asset) => (
    Object.entries(asset)
      .filter(([k]) => !['id', 'assetType', 'label', 'createdAt', 'documentDownload'].includes(k))
      .map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
          <span style={{ fontSize: 11, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-all' }}>{renderValue(v)}</span>
        </div>
      ))
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        <Brand subtitle="Nominee Death Verification Portal" />

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ padding: '4px 14px', background: 'rgba(100,140,220,0.1)', border: '1px solid rgba(100,140,220,0.3)', borderRadius: 2, fontSize: 9, color: '#7799ee', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            Public Portal - No Login Required
          </span>
        </div>

        {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

        <Card>
          <div style={{ padding: 32 }}>
            {step === 'form' && (
              <>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: 'var(--bright)', marginBottom: 8 }}>
                  Submit Death Certificate
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.8 }}>
                  Upload official proof for admin review. Once approved, this same portal will unlock vault access.
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                    Nominee Access Token
                  </label>
                  <input value={nomineeToken} onChange={e => setToken(e.target.value)} placeholder="Paste your token from email..."
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, padding: '12px 14px', fontSize: 12, color: 'var(--bright)', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                    Vault Owner Email
                  </label>
                  <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="owner@email.com"
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, padding: '12px 14px', fontSize: 13, color: 'var(--bright)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                    Death Certificate
                  </label>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('cert-file').click()}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--gold)' : file ? 'rgba(76,175,125,0.5)' : 'var(--border)'}`,
                      borderRadius: 4,
                      padding: '28px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragOver ? 'rgba(201,168,76,0.04)' : file ? 'rgba(76,175,125,0.04)' : 'var(--surface)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input id="cert-file" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                      onChange={e => handleFile(e.target.files[0])} />
                    {file ? (
                      <>
                        <div style={{ fontSize: 13, color: '#4caf7d', marginBottom: 4, fontWeight: 600 }}>{file.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB - click to change</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>Drag and drop or click to upload</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>PDF, JPG or PNG - Max 10MB</div>
                      </>
                    )}
                  </div>
                </div>

                <PrimaryButton onClick={handleSubmit} loading={loading} loadingText="Submitting..." disabled={!file || !nomineeToken || !ownerEmail}>
                  Submit for Admin Review
                </PrimaryButton>

                <button
                  onClick={() => checkStatus(nomineeToken.trim(), ownerEmail.trim())}
                  style={{ marginTop: 10, width: '100%', padding: '11px 0', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 2, color: 'var(--muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Check Existing Request Status
                </button>
              </>
            )}

            {step === 'submitted' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: '#4caf7d', marginBottom: 12 }}>
                  Submitted Successfully
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                  Your certificate is now pending admin review. You can use the button below to check status anytime.
                </div>
                <PrimaryButton onClick={() => checkStatus(nomineeToken.trim(), ownerEmail.trim())}>
                  Check Review Status
                </PrimaryButton>
              </div>
            )}

            {step === 'status' && requestStatus && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 42, marginBottom: 14 }}>{statusColors[requestStatus.status]?.icon || '📋'}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: statusColors[requestStatus.status]?.color, marginBottom: 8 }}>
                  {statusColors[requestStatus.status]?.label || requestStatus.status}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                  Submitted: {new Date(requestStatus.submittedAt).toLocaleString()}
                </div>
                {requestStatus.adminNotes && (
                  <div style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, textAlign: 'left', fontSize: 12, color: 'var(--text)', marginBottom: 16 }}>
                    <strong style={{ color: 'var(--muted)' }}>Admin Notes:</strong> {requestStatus.adminNotes}
                  </div>
                )}

                <button
                  onClick={() => checkStatus(nomineeToken.trim(), ownerEmail.trim())}
                  style={{ width: '100%', padding: '11px 0', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 2, color: 'var(--text)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Refresh Status
                </button>

                {requestStatus.status === 'approved' && (
                  <button
                    onClick={() => loadVault(nomineeToken.trim(), ownerEmail.trim())}
                    style={{ marginTop: 10, width: '100%', padding: '11px 0', background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.4)', borderRadius: 2, color: '#4caf7d', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Access Vault Contents
                  </button>
                )}

                {requestStatus.status === 'rejected' && (
                  <button
                    onClick={() => { setStep('form'); setFile(null); }}
                    style={{ marginTop: 10, width: '100%', padding: '11px 0', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Submit New Certificate
                  </button>
                )}
              </div>
            )}

            {step === 'vault' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: 'var(--bright)' }}>
                      {vaultData?.vault?.vaultName || 'Unlocked Vault'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Owner: {vaultData?.owner?.fullName} ({vaultData?.owner?.email})
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#4caf7d', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(76,175,125,0.4)', padding: '4px 8px', borderRadius: 2 }}>
                    Vault Unlocked
                  </div>
                </div>

                {loadingVault ? (
                  <div style={{ textAlign: 'center', padding: 30, fontSize: 12, color: 'var(--muted)' }}>Loading vault...</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 16, fontSize: 11, color: 'var(--muted)' }}>
                      {vaultData?.vault?.assetCount || 0} assets available
                    </div>

                    {(vaultData?.vault?.assets || []).length === 0 ? (
                      <div style={{ padding: 18, border: '1px dashed var(--border)', borderRadius: 2, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                        No assets were stored in this vault.
                      </div>
                    ) : (
                      <div>
                        {vaultData.vault.assets.map(asset => (
                          <div key={asset.id} style={{ border: '1px solid var(--border)', borderRadius: 2, padding: 12, marginBottom: 10, background: 'var(--surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ color: 'var(--bright)', fontSize: 13 }}>{asset.label}</div>
                              <div style={{ color: 'var(--gold)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{asset.assetType}</div>
                            </div>
                            {renderAssetRows(asset)}
                            {asset.documentDownload?.downloadUrl && (
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                                <a
                                  href={asset.documentDownload.downloadUrl}
                                  download={asset.documentDownload.fileName || 'document'}
                                  style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none' }}
                                >
                                  Download document: {asset.documentDownload.fileName || 'file'}
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(vaultData?.deliveredMessages || []).length > 0 && (
                      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                          Delivered Final Messages
                        </div>
                        {vaultData.deliveredMessages.map(msg => (
                          <div key={msg.id || msg._id} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 2, padding: 10, background: 'var(--surface)' }}>
                            <div style={{ fontSize: 12, color: 'var(--bright)', marginBottom: 6 }}>{msg.title}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                              To: {msg.recipientName || msg.recipientEmail} ({msg.recipientEmail}) • Delivered: {new Date(msg.deliveredAt).toLocaleString()}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 8 }}>
                              {msg.message}
                            </div>
                            {msg.messageType === 'crypto' && msg.cryptoCredentials && (
                              <div style={{ marginBottom: 8, padding: 8, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 2, background: 'rgba(201,168,76,0.05)' }}>
                                {Object.entries(msg.cryptoCredentials).map(([k, v]) => (
                                  v ? (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{k}</span>
                                      <span style={{ fontSize: 11, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-all' }}>{renderValue(v)}</span>
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            )}
                            {msg.attachment?.downloadUrl && (
                              <a
                                href={msg.attachment.downloadUrl}
                                download={msg.attachment.fileName || 'attachment'}
                                style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none' }}
                              >
                                Download attachment: {msg.attachment.fileName || 'file'}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
