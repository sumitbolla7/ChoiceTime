const fs = require('fs');
const path = require('path');
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

function normalizeFilename(url) {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.split('?')[0]; // strip ?updatedAt=...
  const fileName = cleanUrl.split('/').pop() || '';
  const baseName = fileName.split('.')[0].split('_')[0]; // strip extension and random hash suffix
  return baseName.toLowerCase();
}

async function fetchAllDatabaseImageKeys(db) {
  console.log("🔍 Scanning MongoDB database for active product image references...");
  const activeKeys = new Set();
  const collections = await db.listCollections().toArray();
  const productCollections = collections.filter(c => 
    ['products', 'watches', 'mens', 'womens', 'accessories', 'lenses', 'shoes', 'mens_tshirts'].includes(c.name)
  );

  let totalDocs = 0;

  for (const colInfo of productCollections) {
    const collection = db.collection(colInfo.name);
    const docs = await collection.find({}).toArray();
    totalDocs += docs.length;

    for (const doc of docs) {
      const urls = [
        doc.thumbnail,
        doc.image,
        ...(Array.isArray(doc.images) ? doc.images : [])
      ].filter(Boolean);

      urls.forEach(url => {
        const key = normalizeFilename(url);
        if (key) activeKeys.add(key);
      });
    }
  }

  console.log(`✅ Scanned ${totalDocs} documents across ${productCollections.length} collections.`);
  console.log(`✅ Found ${activeKeys.size} unique active product image references in database.`);
  return activeKeys;
}

async function fetchAllImageKitFiles() {
  console.log("\n🔍 Listing files from ImageKit Media Library...");
  let files = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    try {
      const batch = await ik.listFiles({ limit, skip });
      if (!batch || batch.length === 0) break;
      files = files.concat(batch);
      console.log(`  Fetched ${files.length} files from ImageKit...`);
      if (batch.length < limit) break;
      skip += limit;
    } catch (err) {
      console.error(`❌ Error fetching files at skip=${skip}:`, err.message);
      break;
    }
  }

  console.log(`✅ Total files in ImageKit: ${files.length}`);
  return files;
}

async function runImageAudit() {
  console.log("=================================================");
  console.log("📊 STARTING PRODUCT IMAGE AUDIT (Active vs Orphaned)");
  console.log("=================================================");

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected to MongoDB Atlas");
    const db = mongoose.connection.db;

    const dbActiveKeys = await fetchAllDatabaseImageKeys(db);
    const ikFiles = await fetchAllImageKitFiles();

    const activeFiles = [];
    const orphanedFiles = [];

    for (const file of ikFiles) {
      const fileKey = normalizeFilename(file.name);

      if (dbActiveKeys.has(fileKey)) {
        activeFiles.push({ name: file.name, url: file.url, size: file.size, fileId: file.fileId });
      } else {
        orphanedFiles.push({ name: file.name, url: file.url, size: file.size, fileId: file.fileId });
      }
    }

    console.log("\n=================================================");
    console.log(`📈 IMAGE AUDIT RESULTS SUMMARY`);
    console.log(`Total Files in ImageKit:   ${ikFiles.length}`);
    console.log(`Active Products Images:    ${activeFiles.length}`);
    console.log(`Orphaned / Unlinked Files: ${orphanedFiles.length}`);
    console.log("=================================================");

    const reportPath = path.join(__dirname, '..', 'image_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        totalImageKitFiles: ikFiles.length,
        activeCount: activeFiles.length,
        orphanedCount: orphanedFiles.length
      },
      activeFiles: activeFiles.slice(0, 100), // Preview sample
      orphanedFiles
    }, null, 2), 'utf8');

    console.log(`\n✅ Detailed image audit report saved to: ${reportPath}`);

  } catch (error) {
    console.error("❌ Fatal Audit Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runImageAudit();
