const { S3Client } = require('@aws-sdk/client-s3');
const { LambdaClient } = require('@aws-sdk/client-lambda');

const awsConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const s3Client = new S3Client(awsConfig);
const lambdaClient = new LambdaClient(awsConfig);

module.exports = {
  s3Client,
  lambdaClient,
  S3_BUCKET: process.env.AWS_S3_BUCKET,
  S3_REGION: process.env.AWS_REGION || 'ap-southeast-1',
  CLOUDFRONT_URL: process.env.AWS_CLOUDFRONT_URL,
};
