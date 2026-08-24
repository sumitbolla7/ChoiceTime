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

// Source ImageKit Account details
const SOURCE_ENDPOINT = 'https://ik.imagekit.io/pyd0fawt1';

// Target ImageKit Account details (sumitbvalorant)
const TARGET_PUBLIC_KEY = process.env.TARGET_IMAGEKIT_PUBLIC_KEY || 'public_hvDmQzaF2D6D/LbSKdXWfjz6fw0=';
const TARGET_PRIVATE_KEY = process.env.TARGET_IMAGEKIT_PRIVATE_KEY || process.argv[2] || '';
const TARGET_ENDPOINT = 'https://ik.imagekit.io/sumitbvalorant';

if (!TARGET_PRIVATE_KEY) {
  console.error("❌ ERROR: Please provide TARGET_IMAGEKIT_PRIVATE_KEY (starts with private_...) as an env var or command argument!");
  console.error("Usage: node scripts/migrate_to_sumitbvalorant.cjs private_XXXXXX");
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

        if (totalBytes < 1000) {
          return resolve({ isValid: false, reason: `Size too small (${totalBytes}B)`, buffer: null });
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

async function runMigration() {
  console.log("=================================================");
  console.log("🚀 MIGRATING IMAGES FROM pyd0fawt1 ➔ sumitbvalorant");
  console.log("=================================================");

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected to MongoDB Atlas");
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    const productCollections = collections.filter(c => 
      ['products', 'watches', 'mens', 'womens', 'accessories', 'lenses', 'shoes', 'mens_tshirts'].includes(c.name)
    );

    const uploadedUrlsMap = new Map(); // sourceUrl -> targetUrl
    let totalMigrated = 0;
    let totalFailed = 0;

    for (const colInfo of productCollections) {
      console.log(`\nScanning collection: '${colInfo.name}'...`);
      const collection = db.collection(colInfo.name);
      const docs = await collection.find({}).toArray();

      for (const doc of docs) {
        const imageUrls = [];

        if (doc.thumbnail) imageUrls.push({ field: 'thumbnail', url: doc.thumbnail });
        if (doc.image) imageUrls.push({ field: 'image', url: doc.image });
        if (Array.isArray(doc.images)) {
          doc.images.forEach((img, idx) => {
            if (img) imageUrls.push({ field: `images[${idx}]`, url: img });
          });
        }

        for (const item of imageUrls) {
          if (!item.url || !item.url.startsWith('http')) continue;

          let targetUrl = uploadedUrlsMap.get(item.url);

          if (!targetUrl) {
            console.log(`  ⬇️ Fetching: ${item.url}`);
            const download = await fetchImageBuffer(item.url);

            if (!download.isValid) {
              console.warn(`  ⚠️ Could not download ${item.url}: ${download.reason}`);
              totalFailed++;
              continue;
            }

            const urlParts = item.url.split('/');
            const fileName = urlParts[urlParts.length - 1] || `image_${Date.now()}.jpg`;

            console.log(`  ⬆️ Uploading to sumitbvalorant: ${fileName} (${download.size} bytes)...`);
            try {
              const uploadResult = await uploadToTargetImageKit(download.buffer, fileName);
              targetUrl = uploadResult.url;
              uploadedUrlsMap.set(item.url, targetUrl);
              totalMigrated++;
              console.log(`  ✅ Uploaded successfully: ${targetUrl}`);
            } catch (upErr) {
              console.error(`  ❌ Upload error for ${fileName}: ${upErr.message}`);
              totalFailed++;
              continue;
            }
          }
        }
      }
    }

    console.log("\n=================================================");
    console.log(`🎉 MIGRATION COMPLETE SUMMARY`);
    console.log(`Unique Images Uploaded to sumitbvalorant: ${uploadedUrlsMap.size}`);
    console.log(`Total Upload Ops:                       ${totalMigrated}`);
    console.log(`Total Failures:                         ${totalFailed}`);
    console.log("=================================================");

    const mapPath = path.join(__dirname, '..', 'migrated_to_sumitbvalorant_map.json');
    fs.writeFileSync(mapPath, JSON.stringify(Object.fromEntries(uploadedUrlsMap), null, 2), 'utf8');
    console.log(`\n✅ Migration URL map saved to: ${mapPath}`);

  } catch (error) {
    console.error("❌ Fatal Migration Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
