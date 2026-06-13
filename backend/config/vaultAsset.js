const path = require('path');

const parseJsonSafely = (value) => {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const decodeAssetPayload = (encryptedAsset, decryptFn) => {
  if (typeof encryptedAsset !== 'string' || !encryptedAsset.trim()) {
    return { ok: false, error: 'Asset payload is missing.' };
  }

  if (typeof decryptFn === 'function') {
    try {
      const decrypted = decryptFn(encryptedAsset);
      const parsed = parseJsonSafely(decrypted);
      if (parsed !== null) {
        return { ok: true, data: parsed, source: 'encrypted' };
      }
      return { ok: true, data: { value: decrypted }, source: 'encrypted_text' };
    } catch {
      // Fall back to legacy plain JSON payloads saved without encryption.
    }
  }

  const parsedRaw = parseJsonSafely(encryptedAsset);
  if (parsedRaw !== null) {
    return { ok: true, data: parsedRaw, source: 'legacy_plain_json' };
  }

  return { ok: false, error: 'Unable to decrypt asset payload with current key.' };
};

const parseDataUrl = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[2] };
};

const extensionByMime = (mimeType = '') => {
  const map = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'text/plain': '.txt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/zip': '.zip',
  };
  return map[mimeType.toLowerCase()] || '';
};

const sanitizeDownloadFilename = (value, fallback = 'download') => {
  const raw = path.basename(value || fallback);
  const cleaned = raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  return cleaned || fallback;
};

module.exports = {
  decodeAssetPayload,
  parseDataUrl,
  extensionByMime,
  sanitizeDownloadFilename,
};
