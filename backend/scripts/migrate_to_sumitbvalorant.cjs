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

        if (totalBytes < 500) {
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

async function runCompleteActiveMigration() {
  console.log("=================================================");
  console.log("🚀 MIGRATING ALL 6,542 ACTIVE PRODUCT IMAGES TO sumitbvalorant");
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
    let totalUpdatedDocs = 0;

    for (const colInfo of productCollections) {
      console.log(`\nScanning collection: '${colInfo.name}'...`);
      const collection = db.collection(colInfo.name);
      const docs = await collection.find({}).toArray();

      for (const doc of docs) {
        const updateOps = {};
        const objectId = doc._id;

        // Process thumbnail
        if (doc.thumbnail && typeof doc.thumbnail === 'string' && doc.thumbnail.startsWith('http')) {
          if (!doc.thumbnail.includes('sumitbvalorant')) {
            let targetUrl = uploadedUrlsMap.get(doc.thumbnail);
            if (!targetUrl) {
              console.log(`  [thumbnail] ⬇️ Fetching: ${doc.thumbnail}`);
              const download = await fetchImageBuffer(doc.thumbnail);
              if (download.isValid) {
                const fileName = doc.thumbnail.split('/').pop().split('?')[0] || `thumb_${Date.now()}.jpg`;
                try {
                  const uploadRes = await uploadToTargetImageKit(download.buffer, fileName);
                  targetUrl = uploadRes.url;
                  uploadedUrlsMap.set(doc.thumbnail, targetUrl);
                  totalMigrated++;
                } catch (e) {
                  totalFailed++;
                }
              } else {
                totalFailed++;
              }
            }
            if (targetUrl) updateOps.thumbnail = targetUrl;
          }
        }

        // Process image
        if (doc.image && typeof doc.image === 'string' && doc.image.startsWith('http')) {
          if (!doc.image.includes('sumitbvalorant')) {
            let targetUrl = uploadedUrlsMap.get(doc.image);
            if (!targetUrl) {
              console.log(`  [image] ⬇️ Fetching: ${doc.image}`);
              const download = await fetchImageBuffer(doc.image);
              if (download.isValid) {
                const fileName = doc.image.split('/').pop().split('?')[0] || `img_${Date.now()}.jpg`;
                try {
                  const uploadRes = await uploadToTargetImageKit(download.buffer, fileName);
                  targetUrl = uploadRes.url;
                  uploadedUrlsMap.set(doc.image, targetUrl);
                  totalMigrated++;
                } catch (e) {
                  totalFailed++;
                }
              } else {
                totalFailed++;
              }
            }
            if (targetUrl) updateOps.image = targetUrl;
          }
        }

        // Process images array
        if (Array.isArray(doc.images) && doc.images.length > 0) {
          const newImagesArray = [...doc.images];
          let arrayModified = false;

          for (let i = 0; i < doc.images.length; i++) {
            const imgUrl = doc.images[i];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http') && !imgUrl.includes('sumitbvalorant')) {
              let targetUrl = uploadedUrlsMap.get(imgUrl);
              if (!targetUrl) {
                console.log(`  [images[${i}]] ⬇️ Fetching: ${imgUrl}`);
                const download = await fetchImageBuffer(imgUrl);
                if (download.isValid) {
                  const fileName = imgUrl.split('/').pop().split('?')[0] || `arr_${Date.now()}.jpg`;
                  try {
                    const uploadRes = await uploadToTargetImageKit(download.buffer, fileName);
                    targetUrl = uploadRes.url;
                    uploadedUrlsMap.set(imgUrl, targetUrl);
                    totalMigrated++;
                  } catch (e) {
                    totalFailed++;
                  }
                } else {
                  totalFailed++;
                }
              }
              if (targetUrl) {
                newImagesArray[i] = targetUrl;
                arrayModified = true;
              }
            }
          }

          if (arrayModified) {
            updateOps.images = newImagesArray;
          }
        }

        // Update MongoDB if fields were updated
        if (Object.keys(updateOps).length > 0) {
          await collection.updateOne({ _id: objectId }, { $set: updateOps });
          totalUpdatedDocs++;
        }
      }
    }

    console.log("\n=================================================");
    console.log(`🎉 COMPLETE 6,542 ACTIVE PRODUCT MIGRATION SUMMARY`);
    console.log(`Unique Images Uploaded to sumitbvalorant: ${uploadedUrlsMap.size}`);
    console.log(`Total Upload Operations:               ${totalMigrated}`);
    console.log(`MongoDB Documents Updated:             ${totalUpdatedDocs}`);
    console.log(`Failed / Unreachable Downloads:        ${totalFailed}`);
    console.log("=================================================");

    const mapPath = path.join(__dirname, '..', 'migrated_all_active_6542_map.json');
    fs.writeFileSync(mapPath, JSON.stringify(Object.fromEntries(uploadedUrlsMap), null, 2), 'utf8');
    console.log(`\n✅ Full migration URL map saved to: ${mapPath}`);

  } catch (error) {
    console.error("❌ Fatal Migration Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runCompleteActiveMigration();
