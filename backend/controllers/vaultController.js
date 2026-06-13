const Vault = require('../models/Vault');
const { encrypt, decrypt } = require('../config/encryption');
const { auditLog, AUDIT_ACTIONS } = require('../config/audit');
const { decodeAssetPayload } = require('../config/vaultAsset');

// ─── GET /api/vault ────────────────────────────────
// Get vault + decrypt all assets
const getVault = async (req, res) => {
  try {
    const vault = await Vault.findOne({ userId: req.userId });
    if (!vault) return res.status(404).json({ success: false, error: 'Vault not found.' });

    // Decrypt each asset
    const decryptedAssets = vault.assets.map(asset => {
      const decoded = decodeAssetPayload(asset.encryptedAsset, decrypt);
      if (!decoded.ok || typeof decoded.data !== 'object' || decoded.data === null) {
        return { id: asset._id, assetType: asset.assetType, label: asset.label, error: decoded.error || 'Decryption failed' };
      }
      return {
        id: asset._id,
        assetType: asset.assetType,
        label: asset.label,
        createdAt: asset.createdAt,
        ...decoded.data,
      };
    });

    await auditLog({ userId: req.userId, action: AUDIT_ACTIONS.VAULT_ACCESSED, ipAddress: req.ip });

    return res.json({
      success: true,
      vault: {
        id: vault._id,
        vaultName: vault.vaultName,
        isLocked: vault.isLocked,
        assetCount: vault.assets.length,
        assets: decryptedAssets,
        updatedAt: vault.updatedAt,
      }
    });
  } catch (err) {
    console.error('getVault error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve vault.' });
  }
};

// ─── POST /api/vault/assets ────────────────────────
// Add encrypted asset
const addAsset = async (req, res) => {
  try {
    const { assetType, label, data } = req.body;

    if (!assetType || !label || !data) {
      return res.status(400).json({ success: false, error: 'assetType, label, and data are required.' });
    }

    const allowedTypes = ['password', 'document', 'crypto', 'note', 'other'];
    if (!allowedTypes.includes(assetType)) {
      return res.status(400).json({ success: false, error: `assetType must be one of: ${allowedTypes.join(', ')}` });
    }

    // Encrypt the asset data
    const encryptedAsset = encrypt(JSON.stringify(data));

    const vault = await Vault.findOneAndUpdate(
      { userId: req.userId },
      { $push: { assets: { encryptedAsset, assetType, label } } },
      { new: true }
    );

    if (!vault) return res.status(404).json({ success: false, error: 'Vault not found.' });

    const newAsset = vault.assets[vault.assets.length - 1];

    await auditLog({ userId: req.userId, action: AUDIT_ACTIONS.ASSET_ADDED, metadata: { assetType, label }, ipAddress: req.ip });

    return res.status(201).json({
      success: true,
      message: 'Asset added and encrypted.',
      asset: { id: newAsset._id, assetType: newAsset.assetType, label: newAsset.label, createdAt: newAsset.createdAt }
    });
  } catch (err) {
    console.error('addAsset error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add asset.' });
  }
};

// ─── DELETE /api/vault/assets/:assetId ────────────
const deleteAsset = async (req, res) => {
  try {
    const { assetId } = req.params;

    const vault = await Vault.findOneAndUpdate(
      { userId: req.userId },
      { $pull: { assets: { _id: assetId } } },
      { new: true }
    );

    if (!vault) return res.status(404).json({ success: false, error: 'Vault not found.' });

    await auditLog({ userId: req.userId, action: 'ASSET_DELETED', metadata: { assetId }, ipAddress: req.ip });

    return res.json({ success: true, message: 'Asset deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete asset.' });
  }
};

// ─── GET /api/vault/assets/:assetId ───────────────
// Get single decrypted asset
const getAsset = async (req, res) => {
  try {
    const { assetId } = req.params;
    const vault = await Vault.findOne({ userId: req.userId });
    if (!vault) return res.status(404).json({ success: false, error: 'Vault not found.' });

    const asset = vault.assets.id(assetId);
    if (!asset) return res.status(404).json({ success: false, error: 'Asset not found.' });

    const decoded = decodeAssetPayload(asset.encryptedAsset, decrypt);
    if (!decoded.ok || typeof decoded.data !== 'object' || decoded.data === null) {
      return res.status(422).json({ success: false, error: decoded.error || 'Failed to decrypt asset.' });
    }

    return res.json({
      success: true,
      asset: { id: asset._id, assetType: asset.assetType, label: asset.label, createdAt: asset.createdAt, ...decoded.data }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve asset.' });
  }
};

module.exports = { getVault, addAsset, deleteAsset, getAsset };
