
import { useState, useEffect, useRef } from 'react';
import { vaultAPI } from '../utils/api';
import { Alert, PrimaryButton, PageLoader } from '../components/UI';

const ASSET_TYPES = [
  { key: 'password', icon: '🔑', label: 'Password' },
  { key: 'document', icon: '📄', label: 'Document' },
  { key: 'crypto',   icon: '₿',  label: 'Crypto' },
  { key: 'note',     icon: '📝', label: 'Note' },
  { key: 'other',    icon: '📦', label: 'Other' },
];

const ASSET_ICONS = { password: '🔑', document: '📄', crypto: '₿', note: '📝', other: '📦' };

// ── Shared input style ──────────────────────────────
const inputStyle = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 2, padding: '10px 12px', fontSize: 12, color: 'var(--bright)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: 10, letterSpacing: '0.15em', color: 'var(--muted)',
  textTransform: 'uppercase', marginBottom: 6,
};

function Field({ label, children, style = {} }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = 'var(--border2)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
      onFocus={e => e.target.style.borderColor = 'var(--border2)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{ ...inputStyle, cursor: 'pointer' }}>
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>
      ))}
    </select>
  );
}

// ── File Upload Field ──────────────────────────────
function FileUploadField({ file, onChange }) {
  const ref = useRef();
  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--gold)'; }}
      onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      onDrop={e => {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--border)';
        const f = e.dataTransfer.files[0];
        if (f) onChange(f);
      }}
      style={{
        border: '1px dashed var(--border)', borderRadius: 2, padding: '24px 16px',
        textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
        background: 'var(--surface)',
      }}>
      <input ref={ref} type="file" style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xls,.xlsx,.zip"
        onChange={e => onChange(e.target.files[0])} />
      {file ? (
        <div>
          <div style={{ fontSize: 22, marginBottom: 6 }}>📎</div>
          <div style={{ fontSize: 12, color: 'var(--bright)' }}>{file.name}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
            {(file.size / 1024).toFixed(1)} KB · Click to change
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Drop a file here or <span style={{ color: 'var(--gold)' }}>click to browse</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            PDF, DOC, DOCX, JPG, PNG, TXT, XLS, ZIP
          </div>
        </div>
      )}
    </div>
  );
}

// ── Password Form ──────────────────────────────────
function PasswordForm({ data, onChange }) {
  const [showPw, setShowPw] = useState(false);
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <>
      <Field label="Username / Email">
        <TextInput value={data.username || ''} onChange={e => set('username', e.target.value)} placeholder="user@example.com" />
      </Field>
      <Field label="Password">
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} value={data.password || ''}
            onChange={e => set('password', e.target.value)}
            placeholder="Enter password"
            style={{ ...inputStyle, paddingRight: 40 }}
            onFocus={e => e.target.style.borderColor = 'var(--border2)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button type="button" onClick={() => setShowPw(s => !s)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)' }}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
      </Field>
      <Field label="Website / URL">
        <TextInput value={data.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://..." />
      </Field>
      <Field label="2FA / Recovery Codes">
        <TextArea value={data.recovery || ''} onChange={e => set('recovery', e.target.value)} placeholder="Backup codes, TOTP secret, etc." rows={2} />
      </Field>
      <Field label="Notes">
        <TextArea value={data.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Additional information..." />
      </Field>
    </>
  );
}

// ── Document Form ──────────────────────────────────
function DocumentForm({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <>
      <Field label="Document Type">
        <SelectInput value={data.docType || 'personal'}
          onChange={e => set('docType', e.target.value)}
          options={[
            { value: 'personal',   label: 'Personal ID / Passport' },
            { value: 'financial',  label: 'Financial Document' },
            { value: 'legal',      label: 'Legal / Will / Trust' },
            { value: 'medical',    label: 'Medical Record' },
            { value: 'property',   label: 'Property / Deed' },
            { value: 'insurance',  label: 'Insurance Policy' },
            { value: 'other',      label: 'Other Document' },
          ]}
        />
      </Field>
      <Field label="Upload File">
        <FileUploadField file={data._file || null} onChange={f => {
          // Store file metadata as text (base64 note for vault)
          const reader = new FileReader();
          reader.onload = ev => {
            set('fileData', ev.target.result);
            onChange({ ...data, _file: f, fileName: f.name, fileSize: f.size, fileType: f.type, fileData: ev.target.result });
          };
          reader.readAsDataURL(f);
        }} />
      </Field>
      <Field label="Document Number / Reference" style={{ marginTop: 14 }}>
        <TextInput value={data.docNumber || ''} onChange={e => set('docNumber', e.target.value)} placeholder="e.g. Passport No., Policy No." />
      </Field>
      <Field label="Issued By">
        <TextInput value={data.issuedBy || ''} onChange={e => set('issuedBy', e.target.value)} placeholder="Issuing authority or organization" />
      </Field>
      <Field label="Expiry Date">
        <TextInput type="date" value={data.expiryDate || ''} onChange={e => set('expiryDate', e.target.value)} />
      </Field>
      <Field label="Notes">
        <TextArea value={data.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Location of physical copy, instructions..." />
      </Field>
    </>
  );
}

// ── Crypto Form ────────────────────────────────────
function CryptoForm({ data, onChange }) {
  const [showSeed, setShowSeed] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <>
      <Field label="Blockchain / Network">
        <SelectInput value={data.network || 'bitcoin'}
          onChange={e => set('network', e.target.value)}
          options={[
            { value: 'bitcoin',   label: '₿ Bitcoin (BTC)' },
            { value: 'ethereum',  label: 'Ξ Ethereum (ETH)' },
            { value: 'solana',    label: '◎ Solana (SOL)' },
            { value: 'bnb',       label: '⬡ BNB Chain' },
            { value: 'polygon',   label: '⬟ Polygon (MATIC)' },
            { value: 'cardano',   label: '₳ Cardano (ADA)' },
            { value: 'other',     label: '🔗 Other' },
          ]}
        />
      </Field>
      <Field label="Wallet Address (Public)">
        <TextInput value={data.walletAddress || ''} onChange={e => set('walletAddress', e.target.value)} placeholder="Public wallet address" />
      </Field>
      <Field label="Seed Phrase / Mnemonic">
        <div style={{ position: 'relative' }}>
          <textarea
            value={showSeed ? (data.seedPhrase || '') : (data.seedPhrase ? '•'.repeat(data.seedPhrase.length) : '')}
            onChange={e => set('seedPhrase', showSeed ? e.target.value : data.seedPhrase)}
            readOnly={!showSeed}
            placeholder={showSeed ? "12 or 24-word recovery phrase..." : "Hidden — click 👁 to reveal and edit"}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, paddingRight: 40, letterSpacing: showSeed ? 'normal' : '0.08em' }}
            onFocus={e => e.target.style.borderColor = 'var(--border2)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button type="button" onClick={() => setShowSeed(s => !s)}
            style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)' }}>
            {showSeed ? '🙈' : '👁'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#c9a84c', marginTop: 5 }}>
          ⚠ Never share your seed phrase. This is encrypted at rest.
        </div>
      </Field>
      <Field label="Private Key">
        <div style={{ position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={data.privateKey || ''}
            onChange={e => set('privateKey', e.target.value)}
            placeholder="Private key (hex or WIF format)"
            style={{ ...inputStyle, paddingRight: 40 }}
            onFocus={e => e.target.style.borderColor = 'var(--border2)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button type="button" onClick={() => setShowKey(s => !s)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)' }}>
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
      </Field>
      <Field label="Exchange / Wallet Name">
        <TextInput value={data.exchange || ''} onChange={e => set('exchange', e.target.value)} placeholder="e.g. Coinbase, Ledger, MetaMask" />
      </Field>
      <Field label="Approximate Value (USD)">
        <TextInput value={data.estimatedValue || ''} onChange={e => set('estimatedValue', e.target.value)} placeholder="e.g. 5000" type="number" />
      </Field>
      <Field label="Instructions for Nominee">
        <TextArea value={data.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="How to access, transfer, or sell this asset..." />
      </Field>
    </>
  );
}

// ── Note Form ──────────────────────────────────────
function NoteForm({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <>
      <Field label="Category">
        <SelectInput value={data.category || 'personal'}
          onChange={e => set('category', e.target.value)}
          options={[
            { value: 'personal',     label: 'Personal Message' },
            { value: 'instructions', label: 'Instructions / Wishes' },
            { value: 'contacts',     label: 'Important Contacts' },
            { value: 'financial',    label: 'Financial Summary' },
            { value: 'other',        label: 'Other Note' },
          ]}
        />
      </Field>
      <Field label="Note Content">
        <TextArea value={data.content || ''} onChange={e => set('content', e.target.value)}
          placeholder="Write your note here..." rows={8} />
      </Field>
    </>
  );
}

// ── Other Form ─────────────────────────────────────
function OtherForm({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <>
      <Field label="Asset Category">
        <TextInput value={data.category || ''} onChange={e => set('category', e.target.value)} placeholder="e.g. Loyalty Points, Subscription, Account" />
      </Field>
      <Field label="Account / ID Number">
        <TextInput value={data.accountId || ''} onChange={e => set('accountId', e.target.value)} placeholder="Account number or identifier" />
      </Field>
      <Field label="Username / Email">
        <TextInput value={data.username || ''} onChange={e => set('username', e.target.value)} placeholder="Login username or email" />
      </Field>
      <Field label="Password / PIN">
        <TextInput type="password" value={data.password || ''} onChange={e => set('password', e.target.value)} placeholder="Password or PIN" />
      </Field>
      <Field label="Website / Contact">
        <TextInput value={data.url || ''} onChange={e => set('url', e.target.value)} placeholder="URL or phone number" />
      </Field>
      <Field label="Estimated Value">
        <TextInput value={data.estimatedValue || ''} onChange={e => set('estimatedValue', e.target.value)} placeholder="Monetary or point value" />
      </Field>
      <Field label="Notes">
        <TextArea value={data.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Any additional details..." />
      </Field>
    </>
  );
}

// ── Asset Detail Row ───────────────────────────────
function AssetDetail({ k, v }) {
  if (!v) return null;
  const isSecret = ['password', 'seedPhrase', 'privateKey'].includes(k);
  const [reveal, setReveal] = useState(false);
  const isFileData = k === 'fileData' && typeof v === 'string' && v.startsWith('data:');

  if (isFileData) {
    return (
      <div style={{ marginBottom: 10 }}>
        <span style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Attached File</span>
        <div style={{ marginTop: 6 }}>
          <a href={v} download style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none' }}>
            📥 Download File
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em', flexShrink: 0, marginRight: 12 }}>
        {k.replace(/([A-Z])/g, ' $1').trim()}
      </span>
      <span style={{ color: 'var(--bright)', maxWidth: '65%', wordBreak: 'break-all', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 6 }}>
        {isSecret
          ? (reveal ? v : '•'.repeat(Math.min(v.length, 20)))
          : v}
        {isSecret && (
          <button onClick={() => setReveal(r => !r)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', padding: 0, flexShrink: 0 }}>
            {reveal ? '🙈' : '👁'}
          </button>
        )}
      </span>
    </div>
  );
}

// ── Main Vault Component ───────────────────────────
export default function Vault() {
  const [vault, setVault]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [alert, setAlert]         = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [activeTab, setActiveTab] = useState('password');
  const [label, setLabel]         = useState('');
  const [formData, setFormData]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [filterType, setFilterType] = useState('all');

  const load = async () => {
    try {
      const res = await vaultAPI.getVault();
      setVault(res.data.vault);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load vault.' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormData({});
    setLabel('');
  };

  const handleAdd = async () => {
    if (!label.trim()) return setAlert({ type: 'error', msg: 'Label / Name is required.' });

    // For documents, strip the _file object before sending (keep fileData as base64)
    const cleanData = { ...formData };
    delete cleanData._file;

    setSaving(true);
    try {
      await vaultAPI.addAsset({ assetType: activeTab, label, data: cleanData });
      await load();
      setShowAdd(false);
      setLabel('');
      setFormData({});
      setActiveTab('password');
      setAlert({ type: 'success', msg: 'Asset added and encrypted.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to add asset.' });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset? This cannot be undone.')) return;
    try {
      await vaultAPI.deleteAsset(id);
      await load();
      setAlert({ type: 'success', msg: 'Asset deleted.' });
    } catch {
      setAlert({ type: 'error', msg: 'Delete failed.' });
    }
  };

  const filteredAssets = (vault?.assets || []).filter(a =>
    filterType === 'all' || a.assetType === filterType
  );

  if (loading) return <PageLoader />;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'var(--bright)' }}>
            {vault?.vaultName || 'My Estate Vault'}
          </div>
          <div style={{ fontSize: 11, color: vault?.isLocked ? 'var(--red)' : 'var(--green)', marginTop: 4, letterSpacing: '0.1em' }}>
            {vault?.isLocked ? '🔒 Locked' : '🔓 Active'} · {vault?.assetCount || 0} assets encrypted
          </div>
        </div>
        <button onClick={() => { setShowAdd(s => !s); setLabel(''); setFormData({}); setActiveTab('password'); }}
          style={{ padding: '10px 20px', background: showAdd ? 'rgba(201,168,76,0.1)' : 'transparent', border: '1px solid var(--gold)', borderRadius: 2, color: 'var(--gold)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'background 0.2s' }}>
          {showAdd ? '✕ Cancel' : '+ Add Asset'}
        </button>
      </div>

      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

      {/* Add Asset Panel */}
      {showAdd && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 2, padding: 24, marginBottom: 28 }}>

          {/* Panel Header */}
          <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>
            New Asset
          </div>

          {/* Type Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {ASSET_TYPES.map(t => (
              <button key={t.key} onClick={() => handleTabChange(t.key)}
                style={{
                  padding: '10px 18px', background: 'transparent',
                  border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
                  color: activeTab === t.key ? 'var(--gold)' : 'var(--muted)',
                  fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em', whiteSpace: 'nowrap',
                  transition: 'color 0.2s', marginBottom: -1,
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Label Field (always visible) */}
          <Field label="Label / Name *">
            <TextInput
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={
                activeTab === 'password' ? 'e.g. Gmail, Netflix, Bank Login' :
                activeTab === 'document' ? 'e.g. Passport, House Deed, Will' :
                activeTab === 'crypto'   ? 'e.g. Bitcoin Wallet, ETH Cold Storage' :
                activeTab === 'note'     ? 'e.g. Final Wishes, Emergency Contacts' :
                'e.g. Frequent Flyer Account, Loyalty Card'
              }
            />
          </Field>

          {/* Type-Specific Fields */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 2, padding: '16px 16px 2px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              {ASSET_TYPES.find(t => t.key === activeTab)?.icon} {ASSET_TYPES.find(t => t.key === activeTab)?.label} Details
            </div>

            {activeTab === 'password' && <PasswordForm data={formData} onChange={setFormData} />}
            {activeTab === 'document' && <DocumentForm data={formData} onChange={setFormData} />}
            {activeTab === 'crypto'   && <CryptoForm   data={formData} onChange={setFormData} />}
            {activeTab === 'note'     && <NoteForm     data={formData} onChange={setFormData} />}
            {activeTab === 'other'    && <OtherForm    data={formData} onChange={setFormData} />}
          </div>

          <PrimaryButton onClick={handleAdd} loading={saving} loadingText="Encrypting & saving...">
            🔒 Encrypt & Save Asset
          </PrimaryButton>
        </div>
      )}

      {/* Filter Bar */}
      {(vault?.assets?.length > 0) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterType('all')}
            style={{ padding: '5px 12px', background: filterType === 'all' ? 'rgba(201,168,76,0.15)' : 'var(--surface)', border: `1px solid ${filterType === 'all' ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 2, color: filterType === 'all' ? 'var(--gold)' : 'var(--muted)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}>
            All ({vault.assets.length})
          </button>
          {ASSET_TYPES.map(t => {
            const count = vault.assets.filter(a => a.assetType === t.key).length;
            if (!count) return null;
            return (
              <button key={t.key} onClick={() => setFilterType(t.key)}
                style={{ padding: '5px 12px', background: filterType === t.key ? 'rgba(201,168,76,0.15)' : 'var(--surface)', border: `1px solid ${filterType === t.key ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 2, color: filterType === t.key ? 'var(--gold)' : 'var(--muted)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}>
                {t.icon} {t.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {vault?.assets?.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 2 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--bright)', marginBottom: 8 }}>Vault is empty</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Add passwords, documents, crypto wallets, and notes — all encrypted at rest</div>
        </div>
      )}

      {/* Asset List */}
      {filteredAssets.map(asset => (
        <div key={asset.id}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, marginBottom: 8, overflow: 'hidden', transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === asset.id ? null : asset.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>{ASSET_ICONS[asset.assetType] || '📦'}</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--bright)' }}>{asset.label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                  {asset.assetType}
                  {asset.assetType === 'document' && asset.docType && ` · ${asset.docType}`}
                  {asset.assetType === 'crypto' && asset.network && ` · ${asset.network}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{expanded === asset.id ? '▲' : '▼'}</span>
              <button onClick={e => { e.stopPropagation(); handleDelete(asset.id); }}
                style={{ padding: '4px 10px', background: 'rgba(196,85,85,0.1)', border: '1px solid rgba(196,85,85,0.3)', borderRadius: 2, color: '#c45555', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}>
                Delete
              </button>
            </div>
          </div>

          {expanded === asset.id && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--surface)' }}>
              {Object.entries(asset)
                .filter(([k]) => !['id', 'assetType', 'label', 'createdAt', 'error', '_file'].includes(k))
                .map(([k, v]) => <AssetDetail key={k} k={k} v={v} />)
              }
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                Added {new Date(asset.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
