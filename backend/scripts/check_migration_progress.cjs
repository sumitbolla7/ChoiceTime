const fs = require('fs');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function runCheckProgress() {
  console.log("=================================================");
  console.log("📊 CHECKING DATABASE IMAGE HOSTING BREAKDOWN");
  console.log("=================================================");

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected to MongoDB Atlas");
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    const productCollections = collections.filter(c => 
      ['products', 'watches', 'mens', 'womens', 'accessories', 'lenses', 'shoes', 'mens_tshirts'].includes(c.name)
    );

    const breakdown = {
      sumitbvalorant: 0,
      pyd0fawt1: 0,
      l6od6mlo3j: 0,
      cloudinary: 0,
      other: 0
    };

    let totalUrlsFound = 0;

    for (const colInfo of productCollections) {
      const collection = db.collection(colInfo.name);
      const docs = await collection.find({}).toArray();

      for (const doc of docs) {
        const urls = [
          doc.thumbnail,
          doc.image,
          ...(Array.isArray(doc.images) ? doc.images : [])
        ].filter(Boolean);

        for (const url of urls) {
          totalUrlsFound++;
          if (typeof url === 'string') {
            if (url.includes('sumitbvalorant')) breakdown.sumitbvalorant++;
            else if (url.includes('pyd0fawt1')) breakdown.pyd0fawt1++;
            else if (url.includes('l6od6mlo3j')) breakdown.l6od6mlo3j++;
            else if (url.includes('cloudinary')) breakdown.cloudinary++;
            else breakdown.other++;
          }
        }
      }
    }

    console.log("\n=================================================");
    console.log(`📈 IMAGE HOSTING DISTRIBUTION IN MONGODB`);
    console.log(`Total Image References:        ${totalUrlsFound}`);
    console.log(`Hosted on sumitbvalorant:      ${breakdown.sumitbvalorant} (${((breakdown.sumitbvalorant/totalUrlsFound)*100).toFixed(1)}%)`);
    console.log(`Hosted on pyd0fawt1:           ${breakdown.pyd0fawt1} (${((breakdown.pyd0fawt1/totalUrlsFound)*100).toFixed(1)}%)`);
    console.log(`Hosted on l6od6mlo3j:          ${breakdown.l6od6mlo3j} (${((breakdown.l6od6mlo3j/totalUrlsFound)*100).toFixed(1)}%)`);
    console.log(`Hosted on Cloudinary:          ${breakdown.cloudinary} (${((breakdown.cloudinary/totalUrlsFound)*100).toFixed(1)}%)`);
    console.log(`Other / Data URLs:             ${breakdown.other}`);
    console.log("=================================================");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runCheckProgress();
