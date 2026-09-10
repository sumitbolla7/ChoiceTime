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

const asArray = (value) => (Array.isArray(value) ? value : []);

/** Keep first spelling of each color (black / Black count as one). Prefer the entry with more images. */
export const uniqueColorNames = (names) => {
  const seen = new Set();
  const out = [];
  (names || []).forEach((n) => {
    const s = String(n || '').trim();
    if (!s) return;
    const slug = colorSlug(s);
    if (seen.has(slug)) return;
    seen.add(slug);
    out.push(s);
  });
  return out;
};

export const mergeVariantsByColor = (list) => {
  const bySlug = new Map();
  (list || []).forEach((raw) => {
    const n = normalizeColorVariant(raw);
    if (!n || !n.color) return;
    const slug = colorSlug(n.color);
    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, n);
      return;
    }
    const images = [...(prev.images || [])];
    (n.images || []).forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
    bySlug.set(slug, {
      color: prev.images?.length >= (n.images || []).length ? prev.color : n.color,
      hex: prev.hex || n.hex,
      image: images[0] || '',
      images,
      stock: prev.stock !== null && prev.stock !== undefined ? prev.stock : n.stock,
      price: prev.price !== null && prev.price !== undefined ? prev.price : n.price,
    });
  });
  return [...bySlug.values()];
};

export const collectImagesFromVariants = (list) => {
  const images = [];
  mergeVariantsByColor(list).forEach((v) => {
    (v.images || []).forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
  });
  return images;
};

export const storedColorVariants = (product) =>
  mergeVariantsByColor([
    ...asArray(product?.colorVariants),
    ...asArray(product?.productDetails?.colorVariants),
  ]);

export const listProductColorVariants = (product) => {
  const fromVariants = storedColorVariants(product);
  const names = new Set(fromVariants.map((v) => colorSlug(v.color)));
  const extras = uniqueColorNames(
    asArray(product?.colorOptions || product?.colors || (product?.color ? [product.color] : []))
      .map((c) => (typeof c === 'string' ? c : c?.color))
      .filter(Boolean)
  )
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

/** Snapshot used when adding to cart so variant price/images persist on the line item. */
export const productSnapshotForCart = (product, selectedColor) => {
  const active = findVariantByColor(product, selectedColor);
  const snapshot = { ...product };
  if (active?.price !== null && active?.price !== undefined && !Number.isNaN(Number(active.price))) {
    const price = Number(active.price);
    snapshot.price = price;
    snapshot.finalPrice = price;
  }
  if (active?.images?.length) {
    snapshot.images = active.images;
    snapshot.image = active.images[0];
    snapshot.thumbnail = active.images[0];
  }
  return snapshot;
};

export const galleryForColor = (product, selectedColor) => {
  const stored = storedColorVariants(product);
  const activeStored = stored.find((v) => colorsMatch(v.color, selectedColor));
  if (activeStored) {
    return variantGalleryImages(activeStored);
  }

  const active = findVariantByColor(product, selectedColor);
  const variantImgs = variantGalleryImages(active);
  if (variantImgs.length) return variantImgs;

  let mainImages = [];
  if (Array.isArray(product?.images) && product.images.length > 0) {
    mainImages = product.images.filter((img) => img && typeof img === 'string' && img.trim() !== '');
  } else if (product?.images && typeof product.images === 'object') {
    const keys = Object.keys(product.images).filter(
      (k) => product.images[k] && typeof product.images[k] === 'string' && product.images[k].trim() !== ''
    );
    mainImages = keys.map((k) => product.images[k].trim());
  } else if (product?.image || product?.thumbnail) {
    const fallback = product.image || product.thumbnail;
    if (fallback && typeof fallback === 'string' && fallback.trim() !== '') {
      mainImages = [fallback.trim()];
    }
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

export const toAdminColorVariants = (raw, extraNames = []) => {
  const stored = mergeVariantsByColor(Array.isArray(raw) ? raw : []);
  const names = uniqueColorNames([...stored.map((v) => v.color), ...asArray(extraNames)]);
  if (!names.length) return [emptyAdminColorVariant()];
  return names.map((color) => {
    const v = stored.find((item) => colorsMatch(item.color, color)) || {
      color,
      hex: '',
      image: '',
      images: [],
      stock: null,
      price: null,
    };
    return {
      color: v.color,
      hex: v.hex || '',
      image: v.image || '',
      images: v.images || [],
      stock: v.stock === null || v.stock === undefined ? '' : v.stock,
      price: v.price === null || v.price === undefined ? '' : v.price,
    };
  });
};

export const toAdminColorVariantsFromProduct = (product) =>
  toAdminColorVariants(storedColorVariants(product), product?.colorOptions || []);

/** Do not copy the product gallery onto every color — that makes every swatch show the same photos. */
export const buildColorVariantsPayload = (list) =>
  mergeVariantsByColor(list)
    .map((n) => {
      if (!n.color && !n.images.length) return null;
      const payload = {
        color: n.color,
        hex: n.hex || '',
        image: n.images[0] || '',
        images: n.images || [],
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
