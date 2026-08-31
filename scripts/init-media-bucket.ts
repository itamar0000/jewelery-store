/**
 * Creates the local media bucket and makes it publicly readable.
 *
 * DEVELOPMENT ONLY. It targets whatever `MEDIA_S3_*` points at, so it refuses
 * to run against anything that is not obviously a local endpoint - a script
 * that can quietly re-permission a production bucket is a script that
 * eventually will.
 *
 *   npm run media:up && npm run media:init
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const endpoint = process.env.MEDIA_S3_ENDPOINT ?? 'http://localhost:9000';
const bucket = process.env.MEDIA_S3_BUCKET ?? 'jewelry-media';

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|minio)(:\d+)?$/i.test(endpoint);
if (!isLocal) {
  throw new Error(
    `Refusing to run against a non-local endpoint (${endpoint}). ` +
      'This script is for local MinIO only; a real bucket policy is set by whoever provisions it.',
  );
}

const client = new S3Client({
  endpoint,
  region: process.env.MEDIA_S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MEDIA_S3_ACCESS_KEY_ID ?? 'jewelry_dev',
    secretAccessKey: process.env.MEDIA_S3_SECRET_ACCESS_KEY ?? 'jewelry_local_dev',
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`Bucket "${bucket}" already exists.`);
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Created bucket "${bucket}".`);
}

// Public read on the PUBLIC prefix only. The private prefix stays unreadable,
// which is what makes custom-request uploads private by construction rather
// than by convention.
await client.send(
  new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/public/*`],
        },
      ],
    }),
  }),
);

console.log(`Public read enabled on "${bucket}/public/*" only.`);
console.log('\nAdd the MEDIA_* block from .env.example to your .env to use it.');
