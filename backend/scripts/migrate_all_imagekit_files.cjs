const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const ImageKit = require('imagekit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Source ImageKit (pyd0fawt1)
const sourceIk = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/pyd0fawt1',
});

// Target ImageKit (sumitbvalorant)
const TARGET_PUBLIC_KEY = process.env.TARGET_IMAGEKIT_PUBLIC_KEY || 'public_hvDmQzaF2D6D/LbSKdXWfjz6fw0=';
const TARGET_PRIVATE_KEY = process.env.TARGET_IMAGEKIT_PRIVATE_KEY || process.argv[2] || '';
const TARGET_ENDPOINT = 'https://ik.imagekit.io/sumitbvalorant';

if (!TARGET_PRIVATE_KEY) {
  console.error("❌ ERROR: Please provide TARGET_IMAGEKIT_PRIVATE_KEY (starts with private_...) as an env var or command argument!");
  console.error("Usage: node scripts/migrate_all_imagekit_files.cjs private_XXXXXX");
  process.exit(1);
}

const targetIk = new ImageKit({
  publicKey: TARGET_PUBLIC_KEY,
  privateKey: TARGET_PRIVATE_KEY,
  urlEndpoint: TARGET_ENDPOINT,
});

function fetchImageBuffer(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return resolve({ isValid: false, reason: 'Invalid URL', buffer: null });
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchImageBuffer(res.headers.location).then(resolve);
      }

      if (res.statusCode !== 200) {
        return resolve({ isValid: false, reason: `HTTP Status ${res.statusCode}`, buffer: null });
      }

      const chunks = [];
      let totalBytes = 0;

      res.on('data', (chunk) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const bodySnippet = buffer.toString('utf8', 0, Math.min(buffer.length, 300));

        if (bodySnippet.includes('Bandwidth Limit Exceeded') || bodySnippet.includes('<html')) {
          return resolve({ isValid: false, reason: 'Source returned error/HTML', buffer: null });
        }

        return resolve({ isValid: true, buffer, size: totalBytes });
      });
    });

    req.on('error', (err) => {
      resolve({ isValid: false, reason: `Download error: ${err.message}`, buffer: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ isValid: false, reason: 'Timeout', buffer: null });
    });
  });
}

async function uploadToTargetImageKit(buffer, fileName, folder = '/') {
  return new Promise((resolve, reject) => {
    targetIk.upload({
      file: buffer,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: true
    }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

async function fetchAllSourceFiles() {
  let allFiles = [];
  let skip = 0;
  const limit = 100;

  console.log("🔍 Listing ALL media files from pyd0fawt1 account...");

  while (true) {
    try {
      const batch = await sourceIk.listFiles({ limit, skip });
      if (!batch || batch.length === 0) break;
      allFiles = allFiles.concat(batch);
      console.log(`  Fetched ${allFiles.length} files from ImageKit pyd0fawt1...`);
      if (batch.length < limit) break;
      skip += limit;
    } catch (err) {
      console.error(`❌ Error fetching file list at skip=${skip}:`, err.message);
      break;
    }
  }

  return allFiles;
}

async function runBulkMediaMigration() {
  console.log("=================================================");
  console.log("🚀 BULK MEDIA LIBRARY MIGRATION (ALL FILES) pyd0fawt1 ➔ sumitbvalorant");
  console.log("=================================================");

  try {
    const sourceFiles = await fetchAllSourceFiles();
    console.log(`\n📋 Found ${sourceFiles.length} total media files in pyd0fawt1 library.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sourceFiles.length; i++) {
      const fileObj = sourceFiles[i];
      const sourceUrl = fileObj.url;
      const fileName = fileObj.name || `file_${i}.jpg`;
      const filePath = fileObj.filePath || '/';
      const folder = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) || '/' : '/';

      console.log(`\n[${i + 1}/${sourceFiles.length}] ⬇️ Downloading: ${sourceUrl}`);
      const download = await fetchImageBuffer(sourceUrl);

      if (!download.isValid) {
        console.warn(`  ⚠️ Skipped ${fileName}: ${download.reason}`);
        failCount++;
        continue;
      }

      console.log(`  ⬆️ Uploading to sumitbvalorant (folder: ${folder})...`);
      try {
        const uploadResult = await uploadToTargetImageKit(download.buffer, fileName, folder);
        console.log(`  ✅ Uploaded: ${uploadResult.url}`);
        successCount++;
      } catch (upErr) {
        console.error(`  ❌ Upload error for ${fileName}: ${upErr.message}`);
        failCount++;
      }
    }

    console.log("\n=================================================");
    console.log(`🎉 BULK MEDIA MIGRATION COMPLETE SUMMARY`);
    console.log(`Total Media Library Files: ${sourceFiles.length}`);
    console.log(`Successfully Transferred:  ${successCount}`);
    console.log(`Failed / Skipped:          ${failCount}`);
    console.log("=================================================");

  } catch (error) {
    console.error("❌ Fatal Migration Error:", error);
  }
}

runBulkMediaMigration();
