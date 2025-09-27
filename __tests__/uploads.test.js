import { jest } from '@jest/globals';
import { createMockRes } from './helpers/mock-res.js';

const enabledMock = jest.fn();
const uploadMock = jest.fn();
const deleteMock = jest.fn();

jest.unstable_mockModule('../src/utils/cloudinary.js', () => ({
  isCloudinaryEnabled: enabledMock,
  uploadImageBuffer: uploadMock,
  deleteAsset: deleteMock
}));

const { cloudinaryUploadHandler, cloudinaryDeleteHandler } = await import('../src/interfaces/http/controllers/uploads.controller.js');

describe('Cloudinary uploads controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    enabledMock.mockReturnValue(true);
  });

  test('rejects invalid file type', async () => {
    const req = { file: { mimetype: 'application/pdf', buffer: Buffer.from('test') } };
    const res = createMockRes();

    await cloudinaryUploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ message: 'Invalid file type' }) }));
    expect(uploadMock).not.toHaveBeenCalled();
  });

  test('uploads image and returns metadata', async () => {
    const req = { file: { mimetype: 'image/png', buffer: Buffer.from('img'), originalname: 'logo.png' } };
    const res = createMockRes();
    uploadMock.mockResolvedValue({
      secure_url: 'https://cdn.test/logo.png',
      public_id: 'test/logo',
      width: 100,
      height: 80,
      format: 'png',
      bytes: 2048
    });

    await cloudinaryUploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      url: 'https://cdn.test/logo.png',
      publicId: 'test/logo',
      width: 100,
      height: 80,
      format: 'png',
      bytes: 2048
    });
  });

  test('maps Cloudinary auth errors to 401', async () => {
    const req = { file: { mimetype: 'image/jpeg', buffer: Buffer.from('img'), originalname: 'photo.jpg' } };
    const res = createMockRes();
    const err = new Error('Unauthorized');
    err.http_code = 401;
    uploadMock.mockRejectedValue(err);

    await cloudinaryUploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ message: 'Cloudinary authentication failed' }) }));
  });

  test('delete requires publicId', async () => {
    const req = { validated: { body: { publicId: '' } } };
    const res = createMockRes();

    await cloudinaryDeleteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ message: 'publicId required' }) }));
    expect(deleteMock).not.toHaveBeenCalled();
  });

  test('delete propagates auth errors', async () => {
    const req = { validated: { body: { publicId: 'asset/123' } } };
    const res = createMockRes();
    const err = new Error('Invalid Signature');
    err.http_code = 401;
    deleteMock.mockRejectedValue(err);

    await cloudinaryDeleteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ message: 'Cloudinary authentication failed' }) }));
  });

  test('delete succeeds when Cloudinary returns ok', async () => {
    const req = { validated: { body: { publicId: 'asset/123' } } };
    const res = createMockRes();
    deleteMock.mockResolvedValue({ result: 'ok' });

    await cloudinaryDeleteHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ result: { result: 'ok' } });
  });
});
