// Generate a simple SVG placeholder as data URI
export const getPlaceholderImage = (width = 400, height = 400) => {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Multi-Tier Automatic Image CDN Failover:
 * Switches between ImageKit accounts dynamically if bandwidth limit (429) or missing file occurs.
 * Accounts:
 * - pyd0fawt1 (Primary Working ImageKit)
 * - sumitbvalorant (Secondary ImageKit)
 * - l6od6mlo3j (Legacy ImageKit)
 * - Cloudinary (dndqnoxqg)
 * Final: SVG Placeholder
 */
export const handleImageError = (e, width = 400, height = 400) => {
  const img = e.target;
  if (!img) return;

  const currentSrc = img.src || '';

  // Prevent infinite loop if already using SVG placeholder
  if (currentSrc.startsWith('data:image/svg+xml')) {
    return;
  }

  // Track already tried CDN endpoints on this img element attribute
  const triedStr = img.getAttribute('data-tried-cdn') || '';
  const tried = triedStr ? triedStr.split(',') : [];

  // Determine current endpoint
  let currentEp = '';
  if (currentSrc.includes('ik.imagekit.io/sumitbvalorant')) currentEp = 'sumitbvalorant';
  else if (currentSrc.includes('ik.imagekit.io/pyd0fawt1')) currentEp = 'pyd0fawt1';
  else if (currentSrc.includes('ik.imagekit.io/l6od6mlo3j')) currentEp = 'l6od6mlo3j';
  else if (currentSrc.includes('cloudinary')) currentEp = 'cloudinary';

  if (currentEp && !tried.includes(currentEp)) {
    tried.push(currentEp);
  }

  // Failover 1: If sumitbvalorant fails (e.g. 429 rate limit), try pyd0fawt1
  if (currentSrc.includes('ik.imagekit.io/sumitbvalorant') && !tried.includes('pyd0fawt1')) {
    tried.push('pyd0fawt1');
    img.setAttribute('data-tried-cdn', tried.join(','));
    img.src = currentSrc.replace('ik.imagekit.io/sumitbvalorant', 'ik.imagekit.io/pyd0fawt1');
    return;
  }

  // Failover 2: If pyd0fawt1 fails, try sumitbvalorant
  if (currentSrc.includes('ik.imagekit.io/pyd0fawt1') && !tried.includes('sumitbvalorant')) {
    tried.push('sumitbvalorant');
    img.setAttribute('data-tried-cdn', tried.join(','));
    img.src = currentSrc.replace('ik.imagekit.io/pyd0fawt1', 'ik.imagekit.io/sumitbvalorant');
    return;
  }

  // Failover 3: If both primary ImageKit accounts fail, try l6od6mlo3j
  if (!tried.includes('l6od6mlo3j')) {
    tried.push('l6od6mlo3j');
    img.setAttribute('data-tried-cdn', tried.join(','));
    img.src = currentSrc.replace(/ik\.imagekit\.io\/(pyd0fawt1|sumitbvalorant)/, 'ik.imagekit.io/l6od6mlo3j');
    return;
  }

  // Failover 4: Try Cloudinary backup
  if (!tried.includes('cloudinary')) {
    tried.push('cloudinary');
    img.setAttribute('data-tried-cdn', tried.join(','));
    const urlParts = currentSrc.split('/');
    const fileName = urlParts[urlParts.length - 1] || '';
    const baseName = fileName.split('.')[0].split('_')[0];
    if (baseName && !baseName.startsWith('data:')) {
      img.src = `https://res.cloudinary.com/dndqnoxqg/image/upload/${baseName}.jpg`;
      return;
    }
  }

  // Final fallback: SVG "No Image" placeholder
  img.onerror = null;
  img.src = getPlaceholderImage(width, height);
};
