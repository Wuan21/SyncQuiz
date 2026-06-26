const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { s3Client, S3_BUCKET, CLOUDFRONT_URL } = require('../config/aws');

const ALLOWED_MIME = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

const MAX_SIZE = {
  image: 5 * 1024 * 1024,  // 5 MB
  audio: 20 * 1024 * 1024, // 20 MB
};

// POST /api/upload/presign — get a pre-signed URL to upload directly from browser
exports.presign = async (req, res, next) => {
  try {
    const { fileName, contentType, folder = 'uploads' } = req.body;

    const mediaType = ALLOWED_MIME.image.includes(contentType)
      ? 'image'
      : ALLOWED_MIME.audio.includes(contentType)
      ? 'audio'
      : null;

    if (!mediaType) {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    const ext = fileName.split('.').pop().toLowerCase();
    const key = `${folder}/${req.user.id}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = CLOUDFRONT_URL
      ? `${CLOUDFRONT_URL}/${key}`
      : `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/upload/:key — delete a file from S3
exports.deleteFile = async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params['0']); // wildcard path
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
