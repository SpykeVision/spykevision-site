import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const filename = url.searchParams.get('filename');
  const type = url.searchParams.get('type');
  const size = Number(url.searchParams.get('size') || 0);

  if (!filename || !type) {
    return new Response('Missing filename or type', { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return new Response('Only mp4/webm/mov allowed', { status: 400 });
  }
  if (size > MAX_SIZE) {
    return new Response('File too large (max 500 MB)', { status: 400 });
  }

  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
  } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return new Response('R2 not configured', { status: 500 });
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  // Sanitise filename: keep extension, replace spaces/special chars
  const ext = filename.split('.').pop().toLowerCase();
  const base = filename.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const key = `videos/${Date.now()}-${base}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: type,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const publicUrl = `${(R2_PUBLIC_URL || '').replace(/\/$/, '')}/${key}`;

  return new Response(JSON.stringify({ uploadUrl, publicUrl, key }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

