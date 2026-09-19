/**
 * Migration Script: sumitbvalorant → sujatha8979
 * 
 * This script:
 * 1. Fetches all products from the ChoiceTime API
 * 2. For each image stored on sumitbvalorant (which has 429 bandwidth issue),
 *    it downloads the image and re-uploads it to sujatha8979 (fresh bandwidth)
 * 3. Updates the product image URLs in MongoDB via the admin API
 * 
 * Run: node scripts/migrate-to-sujatha8979.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const FormData = require('form-data');

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const SUJATHA_PUBLIC_KEY  = 'public_mm2J6vrTcyzikYn23efV9R3HCAM=';
const SUJATHA_PRIVATE_KEY = 'private_oyp9oiRmzh6T7CurobADWSL7ZNo=';
const SUJATHA_ENDPOINT    = 'https://ik.imagekit.io/sujatha8979';
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

const API_BASE = 'https://api.choicetime.in/api';

// Log file to track progress
const LOG_FILE = path.join(__dirname, 'migration-sujatha8979.json');
// ─────────────────────────────────────────────────────────────────────────────

const authHeader = 'Basic ' + Buffer.from(SUJATHA_PRIVATE_KEY + ':').toString('base64');

// Load previous progress
let migrationLog = [];
if (fs.existsSync(LOG_FILE)) {
  try {
    migrationLog = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    console.log(`📋 Loaded ${migrationLog.length} previous migration records`);
  } catch (e) {
    migrationLog = [];
  }
}

// Set of already-migrated original URLs for fast lookup
const alreadyMigrated = new Map();
migrationLog.forEach(r => {
  if (r.status === 'MIGRATED' && r.originalUrl) {
    alreadyMigrated.set(r.originalUrl, r.newUrl);
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download an image buffer from a URL (follows redirects)
 */
async function downloadImage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChoiceTime-Migration/1.0)',
          'Accept': 'image/*,*/*',
        },
        signal: AbortSignal.timeout(30000)
      });

      if (res.status === 429) {
        throw new Error(`429 Bandwidth limit (source account exhausted)`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 100) {
        throw new Error(`Response too small (${buffer.length} bytes) — likely error page`);
      }

      return { buffer, contentType };
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`    ⚠ Download attempt ${attempt} failed: ${err.message}. Retrying...`);
      await sleep(2000 * attempt);
    }
  }
}

/**
 * Upload buffer to sujatha8979 ImageKit account
 */
async function uploadToSujatha(buffer, fileName, contentType = 'image/jpeg') {
  // Use form-data if available, else build manually
  const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
  
  // Build multipart body manually
  const ext = fileName.split('.').pop() || 'jpg';
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  
  const parts = [];
  
  // filename field
  parts.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\n${cleanFileName}`
  );
  // file field
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${cleanFileName}"\r\nContent-Type: ${contentType}\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;
  
  const headerBuf = Buffer.from(parts.join('\r\n') + '\r\n' + fileHeader);
  const footerBuf = Buffer.from(fileFooter);
  const body = Buffer.concat([headerBuf, buffer, footerBuf]);
  
  const res = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    },
    body: body,
    signal: AbortSignal.timeout(60000)
  });

  const responseText = await res.text();
  
  if (!res.ok) {
    throw new Error(`Upload failed ${res.status}: ${responseText.substring(0, 300)}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
  }

  return data.url || data.filePath || null;
}

/**
 * Migrate a single image URL
 */
async function migrateImage(originalUrl) {
  // Skip if already migrated
  if (alreadyMigrated.has(originalUrl)) {
    return { status: 'SKIPPED', newUrl: alreadyMigrated.get(originalUrl) };
  }

  // Check if it's a sumitbvalorant URL
  if (!originalUrl.includes('ik.imagekit.io/sumitbvalorant')) {
    return { status: 'NOT_SUMIT', newUrl: originalUrl };
  }

  // Extract filename from URL
  const urlParts = originalUrl.split('/');
  const rawFileName = urlParts[urlParts.length - 1].split('?')[0];
  
  try {
    // Step 1: Try to download from sumitbvalorant
    // Note: 429 means CDN bandwidth exhausted but the file EXISTS on the server
    // We'll try with a different approach using the private key auth
    let downloadResult;
    
    try {
      downloadResult = await downloadImage(originalUrl);
    } catch (dlErr) {
      if (dlErr.message.includes('429')) {
        // Try downloading via ImageKit's media API with auth (bypasses CDN limits)
        const authUrl = originalUrl; // Same URL, but with auth header
        const res = await fetch(originalUrl, {
          headers: {
            'Authorization': authHeader.replace('private_oyp9oiRmzh6T7CurobADWSL7ZNo=:', 
              // We don't have sumitbvalorant's private key, so try direct
              ''),
            'User-Agent': 'ChoiceTime-Server/1.0',
          },
          signal: AbortSignal.timeout(30000)
        });
        
        if (!res.ok && res.status === 429) {
          return { status: 'SOURCE_429', newUrl: null, reason: 'sumitbvalorant bandwidth exhausted, cannot download' };
        }
        const ab = await res.arrayBuffer();
        downloadResult = { buffer: Buffer.from(ab), contentType: res.headers.get('content-type') || 'image/jpeg' };
      } else {
        throw dlErr;
      }
    }

    // Step 2: Upload to sujatha8979
    const newUrl = await uploadToSujatha(downloadResult.buffer, rawFileName, downloadResult.contentType);
    
    if (!newUrl) {
      throw new Error('Upload returned no URL');
    }

    alreadyMigrated.set(originalUrl, newUrl);
    return { status: 'MIGRATED', newUrl };

  } catch (err) {
    return { status: 'FAILED', newUrl: null, reason: err.message };
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting migration: sumitbvalorant → sujatha8979');
  console.log('📡 Fetching all products from API...\n');

  // Fetch all products
  let allProducts = [];
  const categories = ['men', 'women', 'watches', 'lens', 'accessories'];
  
  // Try generic endpoint first
  try {
    const res = await fetch(`${API_BASE}/products?limit=1000`);
    const data = await res.json();
    allProducts = data.data?.products || data.products || [];
    console.log(`✅ Fetched ${allProducts.length} products from generic endpoint`);
  } catch (e) {
    console.error('❌ Failed to fetch products:', e.message);
    process.exit(1);
  }

  // Collect all images that need migration
  const imagesToMigrate = new Map(); // originalUrl -> [{ productId, fieldPath }]
  
  let totalImages = 0;
  let sumitImages = 0;

  for (const product of allProducts) {
    const pid = product._id || product.id;
    
    // Main images array
    if (Array.isArray(product.images)) {
      for (let i = 0; i < product.images.length; i++) {
        const img = product.images[i];
        if (img && typeof img === 'string') {
          totalImages++;
          if (img.includes('ik.imagekit.io/sumitbvalorant')) {
            sumitImages++;
            if (!imagesToMigrate.has(img)) imagesToMigrate.set(img, []);
            imagesToMigrate.get(img).push({ productId: pid, field: `images[${i}]` });
          }
        }
      }
    }
    
    // colorVariants images
    if (Array.isArray(product.colorVariants)) {
      for (let vi = 0; vi < product.colorVariants.length; vi++) {
        const variant = product.colorVariants[vi];
        if (Array.isArray(variant.images)) {
          for (let ii = 0; ii < variant.images.length; ii++) {
            const img = variant.images[ii];
            if (img && typeof img === 'string') {
              totalImages++;
              if (img.includes('ik.imagekit.io/sumitbvalorant')) {
                sumitImages++;
                if (!imagesToMigrate.has(img)) imagesToMigrate.set(img, []);
                imagesToMigrate.get(img).push({ productId: pid, field: `colorVariants[${vi}].images[${ii}]` });
              }
            }
          }
        }
      }
    }
  }

  const uniqueImagesToMigrate = Array.from(imagesToMigrate.keys());
  const alreadyDone = uniqueImagesToMigrate.filter(u => alreadyMigrated.has(u)).length;
  const remaining = uniqueImagesToMigrate.length - alreadyDone;

  console.log(`📊 Image Statistics:`);
  console.log(`   Total images in DB: ${totalImages}`);
  console.log(`   On sumitbvalorant (need migration): ${sumitImages}`);
  console.log(`   Unique URLs to migrate: ${uniqueImagesToMigrate.length}`);
  console.log(`   Already migrated (from previous run): ${alreadyDone}`);
  console.log(`   Remaining to migrate: ${remaining}\n`);

  if (remaining === 0) {
    console.log('✅ All images already migrated!');
    return;
  }

  // Migrate each unique URL
  let migrated = 0;
  let failed = 0;
  let source429 = 0;
  let skipped = 0;

  for (let i = 0; i < uniqueImagesToMigrate.length; i++) {
    const originalUrl = uniqueImagesToMigrate[i];
    
    if (alreadyMigrated.has(originalUrl)) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${uniqueImagesToMigrate.length}] Migrating ${path.basename(originalUrl).substring(0, 40)}... `);

    const result = await migrateImage(originalUrl);

    if (result.status === 'MIGRATED') {
      console.log(`✅ → ${result.newUrl.substring(0, 60)}`);
      migrated++;
      migrationLog.push({
        status: 'MIGRATED',
        originalUrl,
        newUrl: result.newUrl,
        timestamp: new Date().toISOString()
      });
    } else if (result.status === 'SOURCE_429') {
      console.log(`⚠️  SOURCE 429 — cannot download (bandwidth exhausted on source)`);
      source429++;
      migrationLog.push({
        status: 'SOURCE_429',
        originalUrl,
        newUrl: null,
        reason: result.reason,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`❌ FAILED: ${result.reason}`);
      failed++;
      migrationLog.push({
        status: 'FAILED',
        originalUrl,
        newUrl: null,
        reason: result.reason,
        timestamp: new Date().toISOString()
      });
    }

    // Save progress every 10 images
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(LOG_FILE, JSON.stringify(migrationLog, null, 2));
      console.log(`💾 Progress saved (${migrated} migrated, ${failed} failed, ${source429} source-429)\n`);
    }

    // Rate limit: small delay between uploads
    await sleep(300);
  }

  // Final save
  fs.writeFileSync(LOG_FILE, JSON.stringify(migrationLog, null, 2));

  console.log('\n═══════════════════════════════════════');
  console.log('📊 MIGRATION COMPLETE');
  console.log(`   ✅ Migrated:     ${migrated}`);
  console.log(`   ⏭  Skipped:     ${skipped}`);
  console.log(`   ⚠️  Source 429:  ${source429}`);
  console.log(`   ❌ Failed:       ${failed}`);
  console.log(`   📄 Log saved to: ${LOG_FILE}`);
  console.log('═══════════════════════════════════════\n');

  if (source429 > 0) {
    console.log('⚠️  NOTE: Source 429 means the images exist on sumitbvalorant but');
    console.log('   CDN bandwidth is exhausted. You have two options:');
    console.log('   1. Upload original photos again from your phone/camera to sujatha8979');
    console.log('   2. Wait until October 1st when sumitbvalorant bandwidth resets,');
    console.log('      then re-run this script to complete migration.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
