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

const ik = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/pyd0fawt1',
});

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
        const bodySnippet = buffer.toString('utf8', 0, Math.min(buffer.length, 300));

        if (bodySnippet.includes('Bandwidth Limit Exceeded') || bodySnippet.includes('<html')) {
          return resolve({ isValid: false, reason: 'Returned HTML/Error page', buffer: null });
        }

        if (totalBytes < 2000) {
          return resolve({ isValid: false, reason: `Size too small (${totalBytes}B)`, buffer: null });
        }

        return resolve({ isValid: true, buffer, size: totalBytes });
      });
    });

    req.on('error', (err) => {
      resolve({ isValid: false, reason: `Network error: ${err.message}`, buffer: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ isValid: false, reason: 'Timeout', buffer: null });
    });
  });
}

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

async function runSecondaryRepair() {
  console.log("=================================================");
  console.log("🛠️ STARTING SECONDARY REPAIR (l6od6mlo3j & Alternate Accounts)");
  console.log("=================================================");

  const reportPath = path.join(__dirname, '..', 'repair-report.json');
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ ERROR: ${reportPath} not found.`);
    process.exit(1);
  }

  const reports = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const failedRecords = reports.filter(r => r.status === 'FAILED');
  console.log(`📋 Found ${failedRecords.length} failed items to search in secondary locations.`);

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected to MongoDB Atlas");
    const db = mongoose.connection.db;

    let repairedCount = 0;
    let stillFailedCount = 0;

    for (const record of failedRecords) {
      console.log(`\nProcessing: [${record.collection}] ${record.productName} (${record.field})...`);
      
      const brokenUrl = record.brokenUrl;
      const urlPath = brokenUrl.replace(/^https:\/\/ik\.imagekit\.io\/[^/]+\//, ''); // e.g. migrated2/xisah4bydtq8j0pdig1e_abc.jpg
      const fileName = urlPath.split('/').pop() || '';
      const baseName = fileName.split('.')[0].split('_')[0];

      // List of candidate source URLs to try
      const candidateUrls = [
        `https://ik.imagekit.io/l6od6mlo3j/${urlPath}`,
        `https://ik.imagekit.io/l6od6mlo3j/${fileName}`,
        `https://res.cloudinary.com/dbaihu0aw/image/upload/${baseName}.jpg`,
        `https://res.cloudinary.com/daxdjob49/image/upload/${baseName}.jpg`,
        `https://res.cloudinary.com/dbaihu0aw/image/upload/${fileName}`,
        `https://res.cloudinary.com/daxdjob49/image/upload/${fileName}`
      ];

      let validDownload = null;
      let workingSource = '';

      for (const candidate of candidateUrls) {
        const download = await fetchAndValidateImage(candidate);
        if (download.isValid) {
          validDownload = download;
          workingSource = candidate;
          break;
        }
      }

      if (!validDownload) {
        console.warn(`  ❌ All candidate sources failed for ${baseName}`);
        stillFailedCount++;
        continue;
      }

      console.log(`  ✅ Found valid image from: ${workingSource} (${validDownload.size} bytes). Uploading to pyd0fawt1...`);

      try {
        const uploadResult = await uploadToImageKit(validDownload.buffer, `${baseName}.jpg`);
        const newUrl = uploadResult.url;
        console.log(`  🎉 Uploaded: ${newUrl}`);

        const collection = db.collection(record.collection);
        const objectId = new mongoose.Types.ObjectId(record.productId);

        if (record.field === 'thumbnail' || record.field === 'image') {
          await collection.updateOne({ _id: objectId }, { $set: { [record.field]: newUrl } });
        } else if (record.field.startsWith('images[')) {
          const arrayIndex = parseInt(record.field.match(/\d+/)[0], 10);
          await collection.updateOne({ _id: objectId }, { $set: { [`images.${arrayIndex}`]: newUrl } });
        }

        console.log(`  💾 Updated MongoDB document for ${record.productId}`);
        repairedCount++;

      } catch (err) {
        console.error(`  ❌ ImageKit upload error: ${err.message}`);
        stillFailedCount++;
      }
    }

    console.log("\n=================================================");
    console.log(`🎉 SECONDARY REPAIR SUMMARY`);
    console.log(`Failed Candidates Processed: ${failedRecords.length}`);
    console.log(`Newly Repaired:              ${repairedCount}`);
    console.log(`Still Unavailable:           ${stillFailedCount}`);
    console.log("=================================================");

  } catch (error) {
    console.error("❌ Fatal Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSecondaryRepair();
