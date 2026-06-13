import { useState, useEffect } from 'react';
import { messagesAPI } from '../utils/api';
import { Alert, PrimaryButton } from '../components/UI';

const empty = {
  title: '',
  message: '',
  recipientName: '',
  recipientEmail: '',
  messageType: 'general',
  cryptoPlatform: '',
  cryptoWalletAddress: '',
  cryptoPrivateKey: '',
  cryptoRecoveryPhrase: '',
  cryptoNotes: '',
  attachmentOriginalName: '',
  attachmentFileName: '',
};

const buildFormData = (form, attachmentFile, removeAttachment) => {
  const fd = new FormData();
  fd.append('title', form.title || '');
  fd.append('message', form.message || '');
  fd.append('recipientName', form.recipientName || '');
  fd.append('recipientEmail', form.recipientEmail || '');
  fd.append('messageType', form.messageType || 'general');
  fd.append('cryptoPlatform', form.cryptoPlatform || '');
  fd.append('cryptoWalletAddress', form.cryptoWalletAddress || '');
  fd.append('cryptoPrivateKey', form.cryptoPrivateKey || '');
  fd.append('cryptoRecoveryPhrase', form.cryptoRecoveryPhrase || '');
  fd.append('cryptoNotes', form.cryptoNotes || '');
  if (attachmentFile) fd.append('attachment', attachmentFile);
  if (removeAttachment) fd.append('removeAttachment', 'true');
  return fd;
};

export default function ScheduledMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  const load = async () => {
    try {
      const r = await messagesAPI.getMessages();
      setMessages(r.data.messages);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load messages.' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetEditor = () => {
    setForm(empty);
    setEditing(null);
    setAttachmentFile(null);
    setRemoveAttachment(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.message || !form.recipientEmail) {
      return setAlert({ type: 'error', msg: 'Title, message, and recipient email are required.' });
    }

    setSaving(true);
    setAlert(null);

    try {
      const payload = buildFormData(form, attachmentFile, removeAttachment);
      if (editing) {
        await messagesAPI.updateMessage(editing, payload);
        setAlert({ type: 'success', msg: 'Message updated.' });
      } else {
        await messagesAPI.createMessage(payload);
        setAlert({ type: 'success', msg: 'Message saved. It will be delivered when your vault is unlocked.' });
      }
      resetEditor();
      setShowForm(false);
      await load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to save.' });
    }

    setSaving(false);
  };

  const handleEdit = (msg) => {
    setForm({
      title: msg.title || '',
      message: msg.message || '',
      recipientName: msg.recipientName || '',
      recipientEmail: msg.recipientEmail || '',
      messageType: msg.messageType || 'general',
      cryptoPlatform: msg.cryptoCredentials?.platform || '',
      cryptoWalletAddress: msg.cryptoCredentials?.walletAddress || '',
      cryptoPrivateKey: msg.cryptoCredentials?.privateKey || '',
      cryptoRecoveryPhrase: msg.cryptoCredentials?.recoveryPhrase || '',
      cryptoNotes: msg.cryptoCredentials?.notes || '',
      attachmentOriginalName: msg.attachmentOriginalName || '',
      attachmentFileName: msg.attachmentFileName || '',
    });
    setEditing(msg._id);
    setAttachmentFile(null);
    setRemoveAttachment(false);
    setShowForm(true);
    setAlert(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this message? Cannot be undone.')) return;
    try {
      await messagesAPI.deleteMessage(id);
      await load();
      setAlert({ type: 'success', msg: 'Message deleted.' });
    } catch {
      setAlert({ type: 'error', msg: 'Failed to delete.' });
    }
  };

  const inp = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 2, padding: '10px 12px', fontSize: 13, color: 'var(--bright)',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'var(--bright)' }}>Scheduled Messages</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, letterSpacing: '0.08em', lineHeight: 1.6 }}>
            Send final messages with optional crypto credentials and file attachments.
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); resetEditor(); setAlert(null); }}
            style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--gold)', borderRadius: 2, color: 'var(--gold)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
          >
            + New Message
          </button>
        )}
      </div>

      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}

      {showForm && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 2, padding: 28, marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>
            {editing ? 'Edit Message' : 'Compose Message'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Recipient Name</label>
              <input style={inp} placeholder="e.g. Sarah" value={form.recipientName}
                onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Recipient Email *</label>
              <input type="email" style={inp} placeholder="recipient@email.com" value={form.recipientEmail}
                onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Message Type</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { key: 'general', label: 'General Message' },
                { key: 'crypto', label: 'Crypto Credentials' },
              ].map(type => (
                <button
                  key={type.key}
                  onClick={() => setForm(f => ({ ...f, messageType: type.key }))}
                  style={{
                    padding: '8px 14px',
                    background: form.messageType === type.key ? 'rgba(201,168,76,0.12)' : 'transparent',
                    border: `1px solid ${form.messageType === type.key ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 2,
                    color: form.messageType === type.key ? 'var(--gold)' : 'var(--muted)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Subject / Title *</label>
            <input style={inp} placeholder="e.g. To my daughter on her wedding day" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
              Message * <span style={{ color: 'var(--muted)', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>({form.message.length}/5000)</span>
            </label>
            <textarea style={{ ...inp, minHeight: 140, resize: 'vertical', lineHeight: 1.7 }}
              placeholder="Write your personal message here..." value={form.message} maxLength={5000}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>

          {form.messageType === 'crypto' && (
            <div style={{ marginBottom: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--surface)' }}>
              <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                Crypto Access Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Platform / Exchange" value={form.cryptoPlatform}
                  onChange={e => setForm(f => ({ ...f, cryptoPlatform: e.target.value }))} />
                <input style={inp} placeholder="Wallet Address" value={form.cryptoWalletAddress}
                  onChange={e => setForm(f => ({ ...f, cryptoWalletAddress: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <input style={inp} placeholder="Private Key" value={form.cryptoPrivateKey}
                  onChange={e => setForm(f => ({ ...f, cryptoPrivateKey: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} placeholder="Recovery Phrase"
                  value={form.cryptoRecoveryPhrase}
                  onChange={e => setForm(f => ({ ...f, cryptoRecoveryPhrase: e.target.value }))} />
              </div>
              <div>
                <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} placeholder="Additional Notes"
                  value={form.cryptoNotes}
                  onChange={e => setForm(f => ({ ...f, cryptoNotes: e.target.value }))} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
              Attachment (optional)
            </label>
            <input
              type="file"
              onChange={e => { setAttachmentFile(e.target.files?.[0] || null); setRemoveAttachment(false); }}
              style={{ ...inp, padding: 8 }}
            />
            {(editing && form.attachmentOriginalName && !removeAttachment) && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                Current file: <span style={{ color: 'var(--text)' }}>{form.attachmentOriginalName}</span>
              </div>
            )}
            {attachmentFile && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gold)' }}>
                New file selected: {attachmentFile.name}
              </div>
            )}
            {(editing && (form.attachmentOriginalName || form.attachmentFileName)) && (
              <label style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)' }}>
                <input type="checkbox" checked={removeAttachment} onChange={e => setRemoveAttachment(e.target.checked)} />
                Remove existing attachment
              </label>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <PrimaryButton onClick={handleSave} loading={saving} loadingText="Saving...">
              {editing ? 'Update Message' : 'Save Message'}
            </PrimaryButton>
            <button
              onClick={() => { setShowForm(false); resetEditor(); setAlert(null); }}
              style={{ padding: '12px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--muted)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 2 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--bright)', marginBottom: 8 }}>No messages yet</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
            Create personal messages, crypto details, and secure attachments<br />to be delivered after vault unlock.
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            {messages.length} message{messages.length !== 1 ? 's' : ''} — delivered on vault unlock
          </div>
          {messages.map(msg => (
            <div key={msg._id} style={{ background: 'var(--card)', border: `1px solid ${msg.isDelivered ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`, borderRadius: 2, padding: '18px 20px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--bright)', marginBottom: 6, fontWeight: 500 }}>{msg.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                    To: <span style={{ color: 'var(--text)' }}>{msg.recipientName || msg.recipientEmail}</span>
                    <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>{msg.recipientEmail}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    {msg.messageType === 'crypto' && (
                      <span style={{ padding: '2px 8px', border: '1px solid rgba(201,168,76,0.4)', color: 'var(--gold)', borderRadius: 2, fontSize: 9, letterSpacing: '0.1em' }}>
                        CRYPTO
                      </span>
                    )}
                    {msg.attachmentOriginalName && (
                      <span style={{ padding: '2px 8px', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 2, fontSize: 9, letterSpacing: '0.1em' }}>
                        FILE ATTACHED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', maxHeight: 36 }}>
                    {msg.message.slice(0, 120)}{msg.message.length > 120 ? '...' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                  {msg.isDelivered ? (
                    <span style={{ padding: '3px 10px', background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.3)', borderRadius: 2, fontSize: 9, color: '#4caf7d', letterSpacing: '0.12em' }}>DELIVERED</span>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(msg)}
                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 2, color: 'var(--muted)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(msg._id)}
                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(196,85,85,0.3)', borderRadius: 2, color: '#c45555', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
