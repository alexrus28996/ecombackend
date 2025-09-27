import { isCloudinaryEnabled, uploadImageBuffer, deleteAsset } from '../../../utils/cloudinary.js';

function resolveCloudinaryStatus(err) {
  const httpCode = err?.http_code || err?.error?.http_code;
  if (httpCode === 401) return 401;
  if (httpCode === 400) return 400;
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('unauthorized') || msg.includes('invalid signature')) return 401;
  if (msg.includes('invalid')) return 400;
  return 500;
}

export function localUploadHandler(req, res) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: { message: 'No file uploaded' } });
  const url = `/uploads/${file.filename}`;
  res.status(201).json({ url, filename: file.filename, mimetype: file.mimetype, size: file.size });
}

export async function cloudinaryUploadHandler(req, res) {
  if (!isCloudinaryEnabled()) return res.status(503).json({ error: { message: 'Cloudinary not configured' } });
  if (!req.file) return res.status(400).json({ error: { message: 'No file uploaded' } });
  if (!req.file.mimetype?.startsWith('image/')) {
    return res.status(400).json({ error: { message: 'Invalid file type' } });
  }
  if (!Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
    return res.status(400).json({ error: { message: 'Invalid file buffer' } });
  }
  try {
    const result = await uploadImageBuffer(req.file.buffer, req.file.originalname);
    res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    });
  } catch (e) {
    const status = resolveCloudinaryStatus(e);
    const message = status === 401 ? 'Cloudinary authentication failed' : status === 400 ? 'Invalid upload request' : 'Upload failed';
    res.status(status).json({ error: { message, details: e.message } });
  }
}

export async function cloudinaryDeleteHandler(req, res) {
  if (!isCloudinaryEnabled()) return res.status(503).json({ error: { message: 'Cloudinary not configured' } });
  const publicId = (req.validated?.body?.publicId || req.body?.publicId || '').trim();
  if (!publicId) return res.status(400).json({ error: { message: 'publicId required' } });
  try {
    const result = await deleteAsset(publicId);
    res.json({ result });
  } catch (e) {
    const status = resolveCloudinaryStatus(e);
    const message = status === 401 ? 'Cloudinary authentication failed' : status === 400 ? 'Invalid delete request' : 'Delete failed';
    res.status(status).json({ error: { message, details: e.message } });
  }
}

