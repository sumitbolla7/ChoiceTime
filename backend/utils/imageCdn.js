const PRIMARY_IK_ACCOUNT = process.env.IMAGEKIT_DELIVERY_ACCOUNT || 'sujatha8979';

export function rewriteIkUrl(url) {
  if (typeof url !== 'string' || !url.includes('ik.imagekit.io/')) return url;
  return url.replace(/ik\.imagekit\.io\/[^/]+\//, `ik.imagekit.io/${PRIMARY_IK_ACCOUNT}/`);
}

function rewriteVariant(variant) {
  if (!variant || typeof variant !== 'object') return variant;
  return {
    ...variant,
    image: rewriteIkUrl(variant.image),
    images: Array.isArray(variant.images) ? variant.images.map(rewriteIkUrl) : variant.images,
  };
}

export function rewriteProductImages(product) {
  if (!product || typeof product !== 'object') return product;
  return {
    ...product,
    image: rewriteIkUrl(product.image),
    thumbnail: rewriteIkUrl(product.thumbnail),
    images: Array.isArray(product.images) ? product.images.map(rewriteIkUrl) : product.images,
    colorVariants: Array.isArray(product.colorVariants)
      ? product.colorVariants.map(rewriteVariant)
      : product.colorVariants,
  };
}
