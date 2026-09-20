/**
 * Copy every live product image onto sujatha8979 (fresh bandwidth).
 *
 * Sources, in order: original URL, other ImageKit accounts, Cloudinary.
 * Uploads keep the same folder + file name so failover can swap account IDs.
 *
 * Run:
 *   IMAGEKIT_PRIVATE_KEY=private_... node scripts/migrate-to-sujatha8979.cjs
 */

const fs = require('fs');
const path = require('path');

const TARGET_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || 'public_mm2J6vrTcyzikYn23efV9R3HCAM=';
const TARGET_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || process.env.SUJATHA_PRIVATE_KEY || '';
const TARGET_ACCOUNT = 'sujatha8979';
const TARGET_ENDPOINT = `https://ik.imagekit.io/${TARGET_ACCOUNT}`;
const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const FILES_API = 'https://api.imagekit.io/v1/files';
const API_BASE = 'https://api.choicetime.in/api';
const CONCURRENCY = 3;

const IK_ACCOUNTS = ['pyd0fawt1', 'sumitbvalorant', 'l6od6mlo3j', 'sujatha8979'];
const EXTRA_URLS = [
  'https://ik.imagekit.io/sumitbvalorant/ChatGPT%20Image%20Aug%2024,%202026,%2003_16_38%20PM.png',
  'https://ik.imagekit.io/pyd0fawt1/raksha%20bandan%20sale%20banner.jpeg',
  'https://ik.imagekit.io/pyd0fawt1/raksha-bandan-sale',
];

const LOG_FILE = path.join(__dirname, 'migration-sujatha8979.json');

if (!TARGET_PRIVATE_KEY) {
  console.error('Missing IMAGEKIT_PRIVATE_KEY (sujatha8979 private key).');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${TARGET_PRIVATE_KEY}:`).toString('base64');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseIkPath(url) {
  const m = String(url).match(/ik\.imagekit\.io\/[^/]+\/(.+?)(?:\?|$)/);
  const rawPath = m ? decodeURIComponent(m[1]) : path.basename(String(url).split('?')[0]);
  const parts = rawPath.split('/').filter(Boolean);
  const fileName = parts.pop() || 'image.jpg';
  const folder = parts.length ? `/${parts.join('/')}` : '';
  return { rawPath, fileName, folder };
}

function swapAccount(src, account) {
  return String(src).replace(/ik\.imagekit\.io\/[^/]+\//, `ik.imagekit.io/${account}/`);
}

function cloudinaryGuesses(url) {
  const { fileName } = parseIkPath(url);
  const base = fileName.replace(/\.[^.]+$/, '');
  const first = base.split('_')[0];
  const guesses = new Set();
  for (const id of [first, base]) {
    if (!id || id.length < 4) continue;
    guesses.add(`https://res.cloudinary.com/dndqnoxqg/image/upload/${id}.jpg`);
    guesses.add(`https://res.cloudinary.com/dndqnoxqg/image/upload/${id}.png`);
    guesses.add(`https://res.cloudinary.com/dndqnoxqg/image/upload/${id}`);
  }
  return [...guesses];
}

function sourceCandidates(originalUrl) {
  const { rawPath, fileName } = parseIkPath(originalUrl);
  const urls = [originalUrl];
  for (const account of IK_ACCOUNTS) {
    urls.push(swapAccount(originalUrl, account));
    urls.push(`https://ik.imagekit.io/${account}/${rawPath}`);
    urls.push(`https://ik.imagekit.io/${account}/${fileName}`);
    urls.push(`https://ik.imagekit.io/${account}/uploads/${fileName}`);
  }
  urls.push(...cloudinaryGuesses(originalUrl));
  return [...new Set(urls.filter(Boolean))];
}

function looksLikeImage(buffer, contentType) {
  if (!buffer || buffer.length < 200) return false;
  if (contentType && contentType.includes('text/html')) return false;
  const b0 = buffer[0];
  const b1 = buffer[1];
  const b2 = buffer[2];
  const b3 = buffer[3];
  const jpeg = b0 === 0xff && b1 === 0xd8;
  const png = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47;
  const gif = b0 === 0x47 && b1 === 0x49 && b2 === 0x46;
  const webp = buffer.slice(0, 4).toString() === 'RIFF';
  const typeOk = !contentType || contentType.startsWith('image/') || contentType === 'application/octet-stream';
  return typeOk && (jpeg || png || gif || webp || (contentType || '').startsWith('image/'));
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ChoiceTime-Migration/2.0', Accept: 'image/*,*/*' },
    signal: AbortSignal.timeout(25000),
    redirect: 'follow',
  });
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!looksLikeImage(buffer, contentType)) return null;
  return { buffer, contentType: contentType.startsWith('image/') ? contentType : 'image/jpeg', sourceUrl: url };
}

async function findWorkingSource(originalUrl) {
  for (const url of sourceCandidates(originalUrl)) {
    try {
      const found = await fetchBuffer(url);
      if (found) return found;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function listTargetFiles() {
  const existing = new Set();
  let skip = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(`${FILES_API}?limit=${limit}&skip=${skip}`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      throw new Error(`List files failed ${res.status}: ${await res.text()}`);
    }
    const files = await res.json();
    if (!Array.isArray(files) || files.length === 0) break;
    for (const f of files) {
      const filePath = String(f.filePath || f.name || '').replace(/^\//, '');
      if (filePath) existing.add(filePath);
      if (f.name) existing.add(f.name);
    }
    if (files.length < limit) break;
    skip += files.length;
  }
  return existing;
}

async function uploadBuffer({ buffer, contentType, fileName, folder }) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: contentType || 'image/jpeg' }), fileName);
  form.append('fileName', fileName);
  form.append('publicKey', TARGET_PUBLIC_KEY);
  form.append('useUniqueFileName', 'false');
  form.append('overwriteFile', 'true');
  if (folder) form.append('folder', folder);

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: form,
    signal: AbortSignal.timeout(90000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Upload ${res.status}: ${text.slice(0, 240)}`);
  const data = JSON.parse(text);
  return data.url || `${TARGET_ENDPOINT}${folder ? `${folder}/` : '/'}${encodeURIComponent(fileName)}`;
}

function collectProductUrls(products) {
  const urls = [];
  for (const p of products) {
    const list = [];
    if (Array.isArray(p.images)) list.push(...p.images);
    list.push(p.image, p.thumbnail);
    if (Array.isArray(p.colorVariants)) {
      for (const v of p.colorVariants) {
        if (v?.image) list.push(v.image);
        if (Array.isArray(v?.images)) list.push(...v.images);
      }
    }
    for (const img of list) {
      if (typeof img === 'string' && img.startsWith('http')) urls.push(img.split('?')[0]);
    }
  }
  return urls;
}

async function mapPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return results;
}

async function main() {
  console.log('Copying live images →', TARGET_ENDPOINT);

  const res = await fetch(`${API_BASE}/products?limit=1000`);
  const json = await res.json();
  const products = json.data?.products || [];
  const unique = [...new Set([...collectProductUrls(products), ...EXTRA_URLS])];
  console.log(`Products: ${products.length}. Unique image URLs: ${unique.length}`);

  console.log('Listing files already on sujatha8979...');
  const existing = await listTargetFiles();
  console.log(`Already on target: ${existing.size}`);

  let log = [];
  if (fs.existsSync(LOG_FILE)) {
    try {
      log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch {
      log = [];
    }
  }
  const done = new Set(log.filter((r) => r.status === 'MIGRATED').map((r) => r.originalUrl));

  const stats = { migrated: 0, skipped: 0, failed: 0 };

  await mapPool(
    unique,
    async (originalUrl, i) => {
      const { rawPath, fileName, folder } = parseIkPath(originalUrl);
      if (done.has(originalUrl) || existing.has(rawPath) || existing.has(fileName)) {
        stats.skipped++;
        if ((i + 1) % 50 === 0) {
          console.log(`[${i + 1}/${unique.length}] skipped existing ${fileName}`);
        }
        return;
      }

      try {
        const found = await findWorkingSource(originalUrl);
        if (!found) {
          stats.failed++;
          log.push({ status: 'NO_SOURCE', originalUrl, timestamp: new Date().toISOString() });
          console.log(`[${i + 1}/${unique.length}] NO SOURCE ${fileName}`);
          return;
        }
        const newUrl = await uploadBuffer({
          buffer: found.buffer,
          contentType: found.contentType,
          fileName,
          folder,
        });
        stats.migrated++;
        existing.add(rawPath);
        existing.add(fileName);
        log.push({
          status: 'MIGRATED',
          originalUrl,
          newUrl,
          source: found.sourceUrl,
          timestamp: new Date().toISOString(),
        });
        console.log(`[${i + 1}/${unique.length}] OK ${fileName} ← ${found.sourceUrl.includes('cloudinary') ? 'cloudinary' : 'imagekit'}`);
      } catch (err) {
        stats.failed++;
        log.push({
          status: 'FAILED',
          originalUrl,
          reason: err.message,
          timestamp: new Date().toISOString(),
        });
        console.log(`[${i + 1}/${unique.length}] FAIL ${fileName}: ${err.message}`);
        await sleep(400);
      }

      if ((i + 1) % 15 === 0) {
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
        console.log(`saved ${stats.migrated} copied, ${stats.skipped} skipped, ${stats.failed} failed`);
      }
    },
    CONCURRENCY
  );

  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log('\nDone.');
  console.log(stats);
  console.log('Log:', LOG_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
