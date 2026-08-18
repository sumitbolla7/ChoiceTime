import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Nav slugs → Product query. Use $or where storefront uses hyphen categories OR watches+gender. */
const SLUG_QUERY = {
  'mens-watches': {
    $or: [
      { category: 'watches', gender: /^men$/i },
      { category: 'watches', gender: /^unisex$/i },
      { category: 'mens-watches' },
      { category: /^mens-watches$/i },
    ],
  },
  'womens-watches': {
    $or: [
      { category: 'watches', gender: /^women$/i },
      { category: 'watches', gender: /^unisex$/i },
      { category: 'womens-watches' },
      { category: /^womens-watches$/i },
    ],
  },
  'mens-wallet': {
    $or: [
      { category: 'accessories', gender: /^men$/i, subCategory: /wallet/i },
      { category: 'mens-wallet' },
    ],
  },
  'womens-wallet': {
    $or: [
      { category: 'accessories', gender: /^women$/i, subCategory: /wallet/i },
      { category: 'womens-wallet' },
    ],
  },
  'mens-belts': {
    $or: [
      { category: 'accessories', gender: /^men$/i, subCategory: /belt/i },
      { category: 'mens-belts' },
    ],
  },
  'mens-belt': {
    $or: [
      { category: 'accessories', gender: /^men$/i, subCategory: /belt/i },
      { category: 'mens-belt' },
    ],
  },
  'womens-belt': {
    $or: [
      { category: 'accessories', gender: /^women$/i, subCategory: /belt/i },
    ],
  },
  'womens-belts': {
    $or: [
      { category: 'accessories', gender: /^women$/i, subCategory: /belt/i },
    ],
  },
  'mens-perfumes': {
    $or: [
      { category: 'accessories', gender: /^men$/i, subCategory: /perfume/i },
      { category: 'men', subCategory: /perfume/i },
      { category: 'mens-perfumes' },
    ],
  },
  'womens-perfumes': {
    $or: [
      { category: 'accessories', gender: /^women$/i, subCategory: /perfume/i },
      { category: 'women', subCategory: /perfume/i },
      { category: 'womens-perfumes' },
    ],
  },
  sunglasses: {
    $or: [{ category: 'lens' }, { category: 'eyewear' }, { category: 'sunglasses' }],
  },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function buildSalesMap() {
  const orders = await Order.find({ status: { $ne: 'cancelled' } }).select('items').lean();
  const map = new Map();
  for (const o of orders) {
    for (const line of o.items || []) {
      const p = line.product || {};
      const id =
        p._id != null && p._id !== ''
          ? String(p._id)
          : p.id != null && p.id !== ''
            ? String(p.id)
            : '';
      if (!id) continue;
      const q = Number(line.quantity) || 1;
      map.set(id, (map.get(id) || 0) + q);
    }
  }
  return map;
}

/** First path segment: /mens-watches?x → mens-watches */
function slugFromNavPath(pathStr) {
  if (!pathStr) return '';
  const noQuery = pathStr.split('?')[0];
  return noQuery.replace(/^\//, '').split('/').filter(Boolean)[0] || '';
}

function resolveProductQueryFromCategory(cat) {
  const path = (cat.path || '').trim();
  let slug = (cat.slug || '').trim();
  if (!slug) slug = slugFromNavPath(path);
  if (slug && SLUG_QUERY[slug]) return SLUG_QUERY[slug];

  if (path.includes('?')) {
    const [pathnamePart, queryPart] = path.split('?');
    const pathname = pathnamePart.replace(/^\//, '').toLowerCase();
    const sp = new URLSearchParams(queryPart);
    const gender = sp.get('gender');
    const subCategory = sp.get('subCategory');
    const q = {};

    if (pathname === 'watches' || pathname === 'watch') q.category = 'watches';
    else if (pathname === 'accessories' || pathname === 'accessory') q.category = 'accessories';
    else if (pathname === 'lens' || pathname === 'lenses') q.category = 'lens';
    else if (pathname === 'eyewear' || pathname === 'sunglasses') q.category = 'eyewear';
    else if (pathname === 'men' || pathname === 'mens') q.category = 'men';
    else if (pathname === 'women' || pathname === 'womens') q.category = 'women';
    else q.category = pathname;

    if (gender) q.gender = gender.toLowerCase();
    if (subCategory) q.subCategory = new RegExp(`^${escapeRegex(subCategory.trim())}$`, 'i');
    return q;
  }

  if (slug) {
    const norm = slug.toLowerCase().replace(/-/g, '');
    if (norm === 'menswatches') return SLUG_QUERY['mens-watches'];
    if (norm === 'womenswatches') return SLUG_QUERY['womens-watches'];
    return { category: slug };
  }
  return null;
}

function pickProductIds(idStrs, salesMap, limit) {
  const withSales = idStrs
    .filter((id) => (salesMap.get(id) || 0) > 0)
    .sort((a, b) => (salesMap.get(b) || 0) - (salesMap.get(a) || 0));

  if (withSales.length === 0) {
    return { ids: shuffle([...idStrs]).slice(0, limit), source: 'random' };
  }

  let picked = withSales.slice(0, limit);
  if (picked.length < limit) {
    const pool = shuffle(idStrs.filter((id) => !picked.includes(id)));
    picked = [...picked, ...pool.slice(0, limit - picked.length)];
  }

  const hasSale = (id) => (salesMap.get(id) || 0) > 0;
  const source = picked.every(hasSale) ? 'sales' : 'mixed';

  return { ids: picked, source };
}

async function buildSectionsForCategories(categories, salesMap, limit) {
  const sections = [];
  for (const cat of categories) {
    const path = (cat.path || '').trim();
    let slug = (cat.slug || '').trim();
    if (!slug) slug = slugFromNavPath(path);

    const label = cat.name || slug || 'Category';
    const viewAllPath = slug ? `/${slug}` : path ? `/${slugFromNavPath(path)}` : '/';

    const productQuery = resolveProductQueryFromCategory(cat);
    if (!productQuery) continue;

    const section = await buildSection({
      label,
      slug,
      viewAllPath,
      productQuery,
      salesMap,
      limit,
    });
    if (section && section.products.length > 0) sections.push(section);
  }
  return sections;
}

async function buildSection({ label, slug, viewAllPath, productQuery, salesMap, limit }) {
  // Hide products the admin has turned off, without deleting them
  const activeQuery = { ...productQuery, isActive: { $ne: false } };
  const docs = await Product.find(activeQuery).select('_id').lean();
  if (docs.length === 0) return null;

  const idStrs = docs.map((d) => String(d._id));
  const { ids: pickedIds, source } = pickProductIds(idStrs, salesMap, limit);

  const oids = pickedIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const full = await Product.find({ _id: { $in: oids }, isActive: { $ne: false } }).lean();
  const byId = new Map(full.map((p) => [String(p._id), p]));
  const products = pickedIds.map((id) => byId.get(id)).filter(Boolean);

  return { label, slug, viewAllPath, products, source };
}

const FALLBACK_CATEGORIES = [
  { name: "Men's Watches", slug: 'mens-watches', path: '/mens-watches' },
  { name: "Women's Watches", slug: 'womens-watches', path: '/womens-watches' },
  { name: "Men's Wallet", slug: 'mens-wallet', path: '/mens-wallet' },
  { name: "Men's Belt", slug: 'mens-belts', path: '/mens-belts' },
  { name: "Men's Perfumes", slug: 'mens-perfumes', path: '/mens-perfumes' },
  { name: "Women's Perfumes", slug: 'womens-perfumes', path: '/womens-perfumes' },
];

export const getHomeTopSelling = async (req, res) => {
  try {
    const limitPerSection = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 4), 20);
    const salesMap = await buildSalesMap();

    let categories = await Category.find().sort({ order: 1 }).lean();
    let sections = await buildSectionsForCategories(
      categories.length ? categories : FALLBACK_CATEGORIES,
      salesMap,
      limitPerSection
    );

    if (sections.length === 0) {
      sections = await buildSectionsForCategories(FALLBACK_CATEGORIES, salesMap, limitPerSection);
    }

    res.status(200).json({ success: true, data: { sections } });
  } catch (error) {
    console.error('getHomeTopSelling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load top selling sections',
      error: error.message,
    });
  }
};
