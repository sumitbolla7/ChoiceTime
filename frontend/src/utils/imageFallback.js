// Generate a simple SVG placeholder as data URI
export const getPlaceholderImage = (width = 400, height = 400) => {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// Multi-tier automatic CDN fallback: Primary ImageKit -> Secondary ImageKit -> Cloudinary -> SVG
export const handleImageError = (e, width = 400, height = 400) => {
  const currentSrc = e.target?.src || '';

  // Prevent infinite loop if already using SVG placeholder
  if (currentSrc.startsWith('data:image/svg+xml')) {
    return;
  }

  // Tier 1: If primary ImageKit account (pyd0fawt1) fails/hits limit, fallback to secondary account (l6od6mlo3j)
  if (currentSrc.includes('ik.imagekit.io/pyd0fawt1')) {
    e.target.src = currentSrc.replace('ik.imagekit.io/pyd0fawt1', 'ik.imagekit.io/l6od6mlo3j');
    return;
  }

  // Tier 2: If secondary ImageKit account fails, try Cloudinary backup
  if (currentSrc.includes('ik.imagekit.io/l6od6mlo3j')) {
    const urlParts = currentSrc.split('/');
    const fileName = urlParts[urlParts.length - 1] || '';
    const baseName = fileName.split('.')[0].split('_')[0];
    if (baseName && !baseName.startsWith('data:')) {
      e.target.src = `https://res.cloudinary.com/dndqnoxqg/image/upload/${baseName}.jpg`;
      return;
    }
  }

  // Tier 3: SVG "No Image" placeholder
  e.target.onerror = null;
  e.target.src = getPlaceholderImage(width, height);
};
