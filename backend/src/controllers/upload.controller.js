const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { s3Client, S3_BUCKET, CLOUDFRONT_URL } = require('../config/aws');
const path = require('path');
const fs = require('fs');

const ALLOWED_MIME = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

const MAX_SIZE = {
  image: 5 * 1024 * 1024,  // 5 MB
  audio: 20 * 1024 * 1024, // 20 MB
};

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function isAWSConfigured() {
  return (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_ACCESS_KEY_ID !== 'your_iam_access_key_id' &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_SECRET_ACCESS_KEY !== 'your_iam_secret_access_key' &&
    S3_BUCKET &&
    S3_BUCKET !== 'syncquiz-media'
  );
}

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
    const fileId = uuidv4();
    const key = `${folder}/${req.user.id}/${fileId}.${ext}`;

    // If AWS is configured, use S3. Otherwise, use local file upload.
    if (isAWSConfigured()) {
      try {
        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        const publicUrl = CLOUDFRONT_URL
          ? `${CLOUDFRONT_URL}/${key}`
          : `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

        res.json({ uploadUrl, publicUrl, key, backend: 's3' });
      } catch (s3Err) {
        console.error('[S3 Error]', s3Err.message);
        // Fallback to local if S3 fails
        return fallbackLocalUpload(req, res, fileId, ext, key, contentType);
      }
    } else {
      // Fallback: local file upload
      fallbackLocalUpload(req, res, fileId, ext, key, contentType);
    }
  } catch (err) {
    next(err);
  }
};

function fallbackLocalUpload(req, res, fileId, ext, key, contentType) {
  // Return a mock presign URL that will be handled by local upload endpoint
  const localPath = path.join('uploads', key.replace(/\//g, '_'));
  const uploadUrl = `http://localhost:${process.env.PORT || 5000}/api/upload/local-put?fileId=${fileId}&ext=${ext}`;
  const publicUrl = `http://localhost:${process.env.PORT || 5000}/api/upload/get/${fileId}.${ext}`;

  console.log('[Upload] Using fallback local storage (not configured for S3)');
  res.json({ uploadUrl, publicUrl, key: fileId, backend: 'local' });
}

// POST /api/upload/local-put — local file upload (fallback when AWS not configured)
exports.localPut = async (req, res, next) => {
  try {
    const { fileId, ext } = req.query;
    if (!fileId || !ext) {
      return res.status(400).json({ message: 'Missing fileId or ext' });
    }

    // Save uploaded body to file
    const filePath = path.join(UPLOADS_DIR, `${fileId}.${ext}`);
    const fileStream = fs.createWriteStream(filePath);

    req.pipe(fileStream);

    fileStream.on('finish', () => {
      res.json({ success: true, key: `${fileId}.${ext}` });
    });

    fileStream.on('error', (err) => {
      next(err);
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/upload/get/:fileId — retrieve local uploaded file
exports.getLocalFile = async (req, res, next) => {
  try {
    const filePath = path.join(UPLOADS_DIR, decodeURIComponent(req.params.fileId));

    // Security: ensure file is within uploads dir
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set CORS headers BEFORE sending file
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // Stream file instead of sendFile to preserve CORS headers
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'File read error' });
      }
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/upload/:key — delete file (S3 or local)
exports.deleteFile = async (req, res, next) => {
  try {
    const key = req.params[0]; // Get wildcard match
    if (!key) {
      return res.status(400).json({ message: 'Missing file key' });
    }

    // Try S3 first if configured
    if (isAWSConfigured()) {
      const deleteCmd = new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key });
      await s3Client.send(deleteCmd);
      return res.json({ success: true });
    }

    // Otherwise delete from local
    const localKey = key.split('/').pop();
    const filePath = path.join(UPLOADS_DIR, localKey);

    if (!filePath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

