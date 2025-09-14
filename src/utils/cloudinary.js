import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';

const enabled = !!(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET);

if (enabled) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
  });
}

export function isCloudinaryEnabled() {
  return enabled;
}

export async function uploadImageBuffer(buffer, filename, folder = config.CLOUDINARY_FOLDER) {
  if (!enabled) throw new Error('Cloudinary not configured');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, public_id: filename?.replace(/\.[^.]+$/, '') }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function deleteAsset(publicId) {
  if (!enabled) throw new Error('Cloudinary not configured');
  const res = await cloudinary.uploader.destroy(publicId);
  return res;
}

