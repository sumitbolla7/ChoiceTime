const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const dns = require('dns');

// Optional DNS fallback for Windows local testing
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI environment variable is missing!");
  process.exit(1);
}

/**
 * Checks an image URL to determine if it is corrupted ("Bandwidth Limit Exceeded" or size < 200 bytes)
 */
function inspectImageUrl(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return resolve({ isValid: false, reason: 'Invalid or empty URL', size: 0 });
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      // Follow redirect if 301 or 302
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return inspectImageUrl(res.headers.location).then(resolve);
      }

      let chunks = [];
      let totalBytes = 0;

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (chunks.length < 5) {
          chunks.push(chunk);
        }
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const bodySnippet = buffer.toString('utf8', 0, Math.min(buffer.length, 300));

        // Check for Bandwidth Limit Exceeded or HTML error pages
        const isBandwidthExceeded = bodySnippet.includes('Bandwidth Limit Exceeded');
        const isHtmlError = bodySnippet.includes('<html') || bodySnippet.includes('<!DOCTYPE html');
        const isTooSmall = totalBytes < 200;

        if (isBandwidthExceeded || (isTooSmall && isHtmlError) || totalBytes < 100) {
          return resolve({
            isValid: false,
            reason: isBandwidthExceeded ? 'Bandwidth Limit Exceeded stub' : (isTooSmall ? 'Content size < 200B' : 'HTML error page'),
            size: totalBytes,
            snippet: bodySnippet.substring(0, 100)
          });
        }

        return resolve({ isValid: true, size: totalBytes });
      });
    });

    req.on('error', (err) => {
      resolve({ isValid: false, reason: `HTTP Request Error: ${err.message}`, size: 0 });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ isValid: false, reason: 'HTTP Request Timeout', size: 0 });
    });
  });
}

async function runScan() {
  console.log("=================================================");
  console.log("🔍 STARTING IMAGEKIT CORRUPTED IMAGE DISCOVERY");
  console.log("=================================================");

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected to MongoDB Atlas");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const productCollections = collections.filter(c => 
      ['products', 'watches', 'mens', 'womens', 'accessories', 'lenses', 'shoes', 'mens_tshirts'].includes(c.name)
    );

    const brokenRecords = [];
    const checkedUrls = new Map(); // Cache URL inspection results to prevent duplicate HTTP requests
    let totalCheckedCount = 0;
    let totalBrokenCount = 0;

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
          totalCheckedCount++;
          let inspection = checkedUrls.get(item.url);

          if (!inspection) {
            inspection = await inspectImageUrl(item.url);
            checkedUrls.set(item.url, inspection);
          }

          if (!inspection.isValid) {
            totalBrokenCount++;
            brokenRecords.push({
              collection: colInfo.name,
              productId: String(doc._id),
              productName: doc.name || doc.title || 'Unnamed Product',
              field: item.field,
              brokenUrl: item.url,
              reason: inspection.reason,
              size: inspection.size
            });
            console.log(` 🚨 BROKEN [${colInfo.name}] ${doc.name || doc._id} (${item.field}): ${inspection.reason} -> ${item.url}`);
          }
        }
      }
    }

    console.log("\n=================================================");
    console.log(`📊 SCAN SUMMARY`);
    console.log(`Total URLs Inspected: ${totalCheckedCount}`);
    console.log(`Unique URLs Checked:  ${checkedUrls.size}`);
    console.log(`Broken Images Found:  ${totalBrokenCount}`);
    console.log("=================================================");

    const outputPath = path.join(__dirname, '..', 'broken-images.json');
    fs.writeFileSync(outputPath, JSON.stringify(brokenRecords, null, 2), 'utf8');
    console.log(`\n✅ Full broken images report saved to: ${outputPath}`);

  } catch (error) {
    console.error("❌ Fatal Scan Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runScan();
