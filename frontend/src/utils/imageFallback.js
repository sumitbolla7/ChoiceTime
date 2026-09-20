// Generate a simple SVG placeholder as data URI
export const getPlaceholderImage = (width = 400, height = 400) => {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Image CDN routing:
 * Serve from sujatha8979 first (fresh bandwidth). If that account is down,
 * swap to the next ImageKit account that still has the same file path,
 * then Cloudinary, then a local SVG placeholder.
 *
 *   sujatha8979 → pyd0fawt1 → sumitbvalorant → l6od6mlo3j → Cloudinary → SVG
 */

export const PRIMARY_IK_ACCOUNT = 'sujatha8979';

const IK_ACCOUNTS = [
  'sujatha8979',
  'pyd0fawt1',
  'sumitbvalorant',
  'l6od6mlo3j',
];

function getIkAccount(src) {
  const m = String(src).match(/ik\.imagekit\.io\/([^/]+)\//);
  return m ? m[1] : '';
}

function swapIkAccount(src, newAccount) {
  return String(src).replace(/ik\.imagekit\.io\/[^/]+\//, `ik.imagekit.io/${newAccount}/`);
}

function fileNameFromSrc(src) {
  return decodeURIComponent(String(src).split('/').pop().split('?')[0] || '');
}

/** Point ImageKit URLs at the live (lowest-bandwidth-used) account. */
export const getLiveImageUrl = (src) => {
  if (!src || typeof src !== 'string') return src;
  if (!src.includes('ik.imagekit.io/')) return src;
  if (src.startsWith('data:')) return src;
  return swapIkAccount(src, PRIMARY_IK_ACCOUNT);
};

function extraPathsForAccount(src, account) {
  const fileName = fileNameFromSrc(src);
  if (!fileName) return [];
  return [
    `https://ik.imagekit.io/${account}/${fileName}`,
    `https://ik.imagekit.io/${account}/uploads/${fileName}`,
  ];
}

export const handleImageError = (e, width = 400, height = 400) => {
  const img = e.target;
  if (!img) return;

  const currentSrc = img.src || '';
  if (currentSrc.startsWith('data:image/svg+xml')) return;

  const triedStr = img.getAttribute('data-tried-cdn') || '';
  const tried = new Set(triedStr ? triedStr.split(',') : []);
  const originalSrc = img.getAttribute('data-original-src') || currentSrc;
  if (!img.getAttribute('data-original-src')) {
    img.setAttribute('data-original-src', originalSrc);
  }

  const currentAccount = getIkAccount(currentSrc);
  if (currentAccount) tried.add(currentAccount);

  const pathTried = img.getAttribute('data-tried-paths') || '';
  const triedPaths = new Set(pathTried ? pathTried.split('||') : []);
  triedPaths.add(currentSrc.split('?')[0]);

  for (const account of IK_ACCOUNTS) {
    const candidates = currentSrc.includes('ik.imagekit.io/')
      ? [swapIkAccount(originalSrc, account), ...extraPathsForAccount(originalSrc, account)]
      : extraPathsForAccount(originalSrc, account);

    for (const next of candidates) {
      const key = next.split('?')[0];
      if (triedPaths.has(key)) continue;
      tried.add(account);
      triedPaths.add(key);
      img.setAttribute('data-tried-cdn', [...tried].join(','));
      img.setAttribute('data-tried-paths', [...triedPaths].join('||'));
      img.src = next;
      return;
    }
    tried.add(account);
  }

  if (!tried.has('cloudinary')) {
    tried.add('cloudinary');
    img.setAttribute('data-tried-cdn', [...tried].join(','));
    const fileName = fileNameFromSrc(originalSrc);
    const baseName = fileName.split('.')[0].split('_')[0];
    if (baseName && !baseName.startsWith('data:') && baseName.length > 3) {
      img.src = `https://res.cloudinary.com/dndqnoxqg/image/upload/${baseName}.jpg`;
      return;
    }
  }

  img.onerror = null;
  img.src = getPlaceholderImage(width, height);
};
