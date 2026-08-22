const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const ImageKit = require('imagekit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// ImageKit Instance initialization
const ik = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/pyd0fawt1',
});

/**
 * Downloads a file buffer from a URL and validates it is a genuine image > 2KB
 */
function fetchAndValidateImage(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return resolve({ isValid: false, reason: 'Invalid URL', buffer: null });
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchAndValidateImage(res.headers.location).then(resolve);
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
        const contentType = res.headers['content-type'] || '';
        const bodySnippet = buffer.toString('utf8', 0, Math.min(buffer.length, 300));

        if (bodySnippet.includes('Bandwidth Limit Exceeded') || bodySnippet.includes('<html')) {
          return resolve({ isValid: false, reason: 'Source returned error/HTML instead of image', buffer: null });
        }

        if (totalBytes < 2000) {
          return resolve({ isValid: false, reason: `File size too small (${totalBytes} bytes)`, buffer: null });
        }

        return resolve({ isValid: true, buffer, size: totalBytes, contentType });
      });
    });

    req.on('error', (err) => {
      resolve({ isValid: false, reason: `Download network error: ${err.message}`, buffer: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ isValid: false, reason: 'Download timeout', buffer: null });
    });
  });
}

/**
 * Uploads a verified image buffer to ImageKit (under /repaired/ folder)
 */
async function uploadToImageKit(buffer, fileName) {
  return new Promise((resolve, reject) => {
    ik.upload({
      file: buffer,
      fileName: fileName,
      folder: '/repaired',
      useUniqueFileName: true
    }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

/**
 * Loads and combines all historical migration mapping files
 */
function loadMigrationMaps() {
  const map = new Map(); // hash/filename -> original Cloudinary URL
  const possiblePaths = [
    '/home/ubuntu/migration-result.json',
    '/home/ubuntu/migration2-result.json',
    '/home/ubuntu/migration3-result.json',
    '/home/ubuntu/urlMap.json',
    '/home/ubuntu/urlMap-zm66wc-old.json',
    '/home/ubuntu/imagekit-migration/urlMap.json',
    path.join(__dirname, '..', 'urlMap.json'),
    path.join(__dirname, '..', 'migration3-result.json')
  ];

  possiblePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      try {
        console.log(`  📖 Reading map file: ${filePath}`);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (Array.isArray(content)) {
          content.forEach(item => {
            if (item.cloudinary_url && (item.imagekit_url || item.cloudinary_id)) {
              const key = item.cloudinary_id || item.imagekit_url;
              map.set(key, item.cloudinary_url);
            }
          });
        } else if (typeof content === 'object') {
          Object.entries(content).forEach(([oldUrl, newUrl]) => {
            map.set(oldUrl, newUrl);
            map.set(newUrl, oldUrl);
          });
        }
      } catch (err) {
        console.warn(`  ⚠️ Could not parse ${filePath}: ${err.message}`);
      }
    }
  });

  console.log(`✅ Loaded ${map.size} historical mappings into memory.`);
  return map;
}

async function runRepair() {
  console.log("=================================================");
  console.log("🛠️ STARTING REPAIR OF BROKEN PRODUCT IMAGES");
  console.log("=================================================");

  const brokenFilePath = path.join(__dirname, '..', 'broken-images.json');
  if (!fs.existsSync(brokenFilePath)) {
    console.error(`❌ ERROR: ${brokenFilePath} not found. Run scan_broken_images.js first!`);
    process.exit(1);
  }

  const brokenRecords = JSON.parse(fs.readFileSync(brokenFilePath, 'utf8'));
  console.log(`📋 Loaded ${brokenRecords.length} broken image entries to repair.`);

  const migrationMap = loadMigrationMaps();

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected to MongoDB Atlas");
    const db = mongoose.connection.db;

    const repairLog = [];
    let successCount = 0;
    let failCount = 0;

    for (const record of brokenRecords) {
      console.log(`\nProcessing: [${record.collection}] ${record.productName} (${record.field})...`);
      
      // Extract Cloudinary ID/key from broken URL
      // e.g. https://ik.imagekit.io/pyd0fawt1/migrated2/p02pdtnfh8duambbuwxy_abc.jpg -> p02pdtnfh8duambbuwxy
      const urlParts = record.brokenUrl.split('/');
      const fileNameWithExt = urlParts[urlParts.length - 1] || '';
      const baseName = fileNameWithExt.split('.')[0].split('_')[0];

      // Try finding Cloudinary URL from map or fallback pattern
      let cloudinaryUrl = migrationMap.get(baseName) || migrationMap.get(record.brokenUrl);
      if (!cloudinaryUrl) {
        // Fallback default Cloudinary URL pattern for account dndqnoxqg
        cloudinaryUrl = `https://res.cloudinary.com/dndqnoxqg/image/upload/${baseName}.jpg`;
      }

      console.log(`  🔍 Testing Cloudinary source: ${cloudinaryUrl}`);
      const download = await fetchAndValidateImage(cloudinaryUrl);

      if (!download.isValid) {
        console.warn(`  ❌ Cloudinary source invalid: ${download.reason}`);
        failCount++;
        repairLog.push({ ...record, status: 'FAILED', reason: download.reason, cloudinaryUrl });
        continue;
      }

      console.log(`  ✅ Source valid (${download.size} bytes). Uploading to ImageKit (/repaired/)...`);
      try {
        const uploadResult = await uploadToImageKit(download.buffer, `${baseName}.jpg`);
        const newUrl = uploadResult.url;
        console.log(`  🎉 Uploaded to ImageKit: ${newUrl}`);

        // Update MongoDB document ONLY after successful upload and validation
        const collection = db.collection(record.collection);
        const objectId = new mongoose.Types.ObjectId(record.productId);

        if (record.field === 'thumbnail' || record.field === 'image') {
          await collection.updateOne({ _id: objectId }, { $set: { [record.field]: newUrl } });
        } else if (record.field.startsWith('images[')) {
          const arrayIndex = parseInt(record.field.match(/\d+/)[0], 10);
          await collection.updateOne({ _id: objectId }, { $set: { [`images.${arrayIndex}`]: newUrl } });
        }

        console.log(`  💾 Updated MongoDB document for ${record.productId}`);
        successCount++;
        repairLog.push({ ...record, status: 'REPAIRED', newUrl, cloudinaryUrl });

      } catch (uploadErr) {
        console.error(`  ❌ ImageKit upload error: ${uploadErr.message}`);
        failCount++;
        repairLog.push({ ...record, status: 'FAILED', reason: `ImageKit upload error: ${uploadErr.message}`, cloudinaryUrl });
      }
    }

    console.log("\n=================================================");
    console.log(`🎉 REPAIR COMPLETE SUMMARY`);
    console.log(`Total Broken Processed: ${brokenRecords.length}`);
    console.log(`Successfully Repaired:  ${successCount}`);
    console.log(`Failed / Unavailable:   ${failCount}`);
    console.log("=================================================");

    const reportPath = path.join(__dirname, '..', 'repair-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(repairLog, null, 2), 'utf8');
    console.log(`\n✅ Detailed repair report saved to: ${reportPath}`);

  } catch (error) {
    console.error("❌ Fatal Repair Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runRepair();
