/** Normalize a stored color variant (string or object) into a consistent shape. */
export const normalizeColorVariant = (variant) => {
  if (!variant) return null;
  if (typeof variant === 'string') {
    const color = variant.trim();
    return color ? { color, hex: '', image: '', images: [], stock: null, price: null } : null;
  }
  const color = String(variant.color || '').trim();
  const images = [];
  if (Array.isArray(variant.images)) {
    variant.images.forEach((url) => {
      const s = String(url || '').trim();
      if (s && !images.includes(s)) images.push(s);
    });
  }
  const single = String(variant.image || '').trim();
  if (single && !images.includes(single)) images.unshift(single);
  const stockRaw = variant.stock;
  const priceRaw = variant.price;
  const stock =
    stockRaw === '' || stockRaw === undefined || stockRaw === null ? null : Number(stockRaw);
  const price =
    priceRaw === '' || priceRaw === undefined || priceRaw === null ? null : Number(priceRaw);
  return {
    color,
    hex: String(variant.hex || '').trim(),
    image: images[0] || '',
    images,
    stock: Number.isNaN(stock) ? null : stock,
    price: Number.isNaN(price) ? null : price,
  };
};

export const variantGalleryImages = (variant) => {
  const n = normalizeColorVariant(variant);
  return n?.images?.length ? n.images : [];
};

export const colorSlug = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

export const colorsMatch = (a, b) =>
  colorSlug(a) === colorSlug(b) && Boolean(colorSlug(a));

export const listProductColorVariants = (product) => {
  const fromVariants = (product?.colorVariants || [])
    .map(normalizeColorVariant)
    .filter((v) => v && v.color);
  const names = new Set(fromVariants.map((v) => colorSlug(v.color)));
  const extras = (product?.colorOptions || product?.colors || (product?.color ? [product.color] : []))
    .filter(Boolean)
    .map((c) => (typeof c === 'string' ? c : c?.color))
    .filter(Boolean)
    .map((color) => normalizeColorVariant({ color }))
    .filter((v) => v && v.color && !names.has(colorSlug(v.color)));
  return [...fromVariants, ...extras];
};

export const findVariantByColor = (product, colorName) =>
  listProductColorVariants(product).find((v) => colorsMatch(v.color, colorName)) || null;

export const isVariantInStock = (variant, product) => {
  if (variant && variant.stock !== null && variant.stock !== undefined) {
    return Number(variant.stock) > 0;
  }
  if (typeof product?.inStock === 'boolean') return product.inStock;
  const raw = product?.stock;
  if (raw === null || raw === undefined || raw === '') return true;
  return Number(raw) > 0;
};

export const pickDefaultColor = (product, urlColor) => {
  const list = listProductColorVariants(product);
  if (!list.length) return '';
  if (urlColor) {
    const fromUrl = list.find((v) => colorsMatch(v.color, urlColor) || colorSlug(v.color) === colorSlug(urlColor));
    if (fromUrl) return fromUrl.color;
  }
  const inStock = list.find((v) => isVariantInStock(v, product));
  return (inStock || list[0]).color;
};

export const galleryForColor = (product, selectedColor) => {
  const active = findVariantByColor(product, selectedColor);
  const variantImgs = variantGalleryImages(active);
  if (variantImgs.length) return variantImgs;

  let mainImages = [];
  if (Array.isArray(product?.images) && product.images.length > 0) {
    mainImages = product.images.filter((img) => img && typeof img === 'string' && img.trim() !== '');
  } else if (product?.image || product?.thumbnail) {
    mainImages = [product.image || product.thumbnail];
  }
  if (mainImages.length === 0) {
    const fallback = listProductColorVariants(product).flatMap((v) => v.images || []);
    if (fallback.length) return fallback;
  }
  return mainImages;
};

export const emptyAdminColorVariant = () => ({
  color: '',
  hex: '',
  image: '',
  images: [],
  stock: '',
  price: '',
});

export const toAdminColorVariants = (raw) => {
  const list = (Array.isArray(raw) ? raw : []).map(normalizeColorVariant).filter(Boolean);
  if (!list.length) return [emptyAdminColorVariant()];
  return list.map((v) => ({
    color: v.color,
    hex: v.hex || '',
    image: v.image || '',
    images: v.images || [],
    stock: v.stock === null || v.stock === undefined ? '' : v.stock,
    price: v.price === null || v.price === undefined ? '' : v.price,
  }));
};

export const buildColorVariantsPayload = (list) =>
  (list || [])
    .map((v) => {
      const n = normalizeColorVariant(v);
      if (!n || (!n.color && !n.images.length)) return null;
      const payload = {
        color: n.color,
        hex: n.hex || '',
        image: n.images[0] || '',
        images: n.images,
      };
      if (n.stock !== null && n.stock !== undefined) payload.stock = n.stock;
      if (n.price !== null && n.price !== undefined) payload.price = n.price;
      return payload;
    })
    .filter(Boolean);

export const swatchCssColor = (variant) => {
  const hex = String(variant?.hex || '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex;
  const name = String(variant?.color || '').trim();
  if (name && /^[a-z]+$/i.test(name) && typeof CSS !== 'undefined' && CSS.supports?.('color', name)) {
    return name;
  }
  return '';
};
