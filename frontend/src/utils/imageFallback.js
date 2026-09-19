// Generate a simple SVG placeholder as data URI
export const getPlaceholderImage = (width = 400, height = 400) => {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * 5-Tier Automatic Image CDN Failover.
 * When one ImageKit account hits its monthly bandwidth limit (HTTP 429),
 * the next account is tried automatically.
 *
 * Failover order (per image):
 *   sumitbvalorant → pyd0fawt1 → sujatha8979 → l6od6mlo3j → Cloudinary → SVG placeholder
 *
 * All accounts store copies of the same images.
 * data-tried-cdn attribute tracks which accounts were already attempted
 * on each <img> element so we never loop.
 */

// All known ImageKit account IDs in priority order
const IK_ACCOUNTS = [
  'sumitbvalorant',  // Primary (1,542 images)
  'pyd0fawt1',       // Secondary (active, has some images)
  'sujatha8979',     // Tertiary (fresh bandwidth — new account added Sep 2026)
  'l6od6mlo3j',      // Legacy
];

/**
 * Extract the ImageKit account ID from an image URL.
 * Returns '' if not an ImageKit URL.
 */
function getIkAccount(src) {
  const m = src.match(/ik\.imagekit\.io\/([^/]+)\//);
  return m ? m[1] : '';
}

/**
 * Replace the ImageKit account ID in a URL.
 */
function swapIkAccount(src, newAccount) {
  return src.replace(/ik\.imagekit\.io\/[^/]+\//, `ik.imagekit.io/${newAccount}/`);
}

export const handleImageError = (e, width = 400, height = 400) => {
  const img = e.target;
  if (!img) return;

  const currentSrc = img.src || '';

  // Prevent infinite loop on SVG placeholder
  if (currentSrc.startsWith('data:image/svg+xml')) return;

  // Track which CDN endpoints have already been tried for this <img>
  const triedStr = img.getAttribute('data-tried-cdn') || '';
  const tried = new Set(triedStr ? triedStr.split(',') : []);

  const currentAccount = getIkAccount(currentSrc);

  // Mark current account as tried
  if (currentAccount) tried.add(currentAccount);

  // Try next ImageKit account that hasn't been attempted yet
  for (const account of IK_ACCOUNTS) {
    if (!tried.has(account)) {
      tried.add(account);
      img.setAttribute('data-tried-cdn', [...tried].join(','));
      img.src = currentSrc.includes('ik.imagekit.io/')
        ? swapIkAccount(currentSrc, account)
        : `https://ik.imagekit.io/${account}/${currentSrc.split('/').pop()}`;
      return;
    }
  }

  // All ImageKit accounts failed — try Cloudinary
  if (!tried.has('cloudinary')) {
    tried.add('cloudinary');
    img.setAttribute('data-tried-cdn', [...tried].join(','));
    const urlParts = currentSrc.split('/');
    const fileName = urlParts[urlParts.length - 1] || '';
    const baseName = fileName.split('?')[0].split('.')[0].split('_')[0];
    if (baseName && !baseName.startsWith('data:') && baseName.length > 3) {
      img.src = `https://res.cloudinary.com/dndqnoxqg/image/upload/${baseName}.jpg`;
      return;
    }
  }

  // Final fallback: SVG "No Image" placeholder
  img.onerror = null;
  img.src = getPlaceholderImage(width, height);
};
