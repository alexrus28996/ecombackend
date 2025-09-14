import { uploadImage } from '../../../utils/uploads.js';
import { isCloudinaryEnabled, uploadImageBuffer, deleteAsset } from '../../../utils/cloudinary.js';

export function localUploadHandler(req, res) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: { message: 'No file uploaded' } });
  const url = `/uploads/${file.filename}`;
  res.status(201).json({ url, filename: file.filename, mimetype: file.mimetype, size: file.size });
}

export async function cloudinaryUploadHandler(req, res) {
  if (!isCloudinaryEnabled()) return res.status(503).json({ error: { message: 'Cloudinary not configured' } });
  if (!req.file) return res.status(400).json({ error: { message: 'No file uploaded' } });
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
    res.status(500).json({ error: { message: 'Upload failed', details: e.message } });
  }
}

export async function cloudinaryDeleteHandler(req, res) {
  if (!isCloudinaryEnabled()) return res.status(503).json({ error: { message: 'Cloudinary not configured' } });
  const publicId = req.validated?.body?.publicId || req.body?.publicId;
  if (!publicId) return res.status(400).json({ error: { message: 'publicId required' } });
  try {
    const result = await deleteAsset(publicId);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: { message: 'Delete failed', details: e.message } });
  }
}

