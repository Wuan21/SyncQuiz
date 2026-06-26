/**
 * Lambda: syncquiz-generate-thumbnail
 * Trigger: S3 PUT event on syncquiz-media/questions/*
 * Purpose: Resize uploaded images to 800x600 max for faster loading
 *
 * Deploy:
 *   cd infrastructure/lambda
 *   npm install
 *   zip -r function.zip .
 *   aws lambda create-function --function-name syncquiz-generate-thumbnail \
 *     --runtime nodejs20.x --handler thumbnail.handler \
 *     --role arn:aws:iam::ACCOUNT_ID:role/syncquiz-lambda-role \
 *     --zip-file fileb://function.zip
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

exports.handler = async (event) => {
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  // Only process images
  if (!key.match(/\.(jpg|jpeg|png|webp)$/i)) return;

  try {
    // Get original
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const buffer = Buffer.concat(await Body.toArray());

    // Resize
    const resized = await sharp(buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Save thumb
    const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb.webp');
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: thumbKey,
      Body: resized,
      ContentType: 'image/webp',
    }));

    console.log(`Thumbnail created: ${thumbKey}`);
    return { statusCode: 200, body: thumbKey };
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
    throw err;
  }
};
