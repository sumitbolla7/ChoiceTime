/** Normalize brand/company names for matching ("Armani exchange" ↔ "armani-exchange"). */
export const slugifySubCategory = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const subCategoryValues = (raw) => {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (raw == null || raw === '') return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * True if product belongs to the company/subcategory filter.
 * Supports multi-company products stored as "fossil, tissot" or ["fossil","tissot"].
 */
export const productMatchesSubCategory = (productOrRaw, target, extraLabels = []) => {
  const isProduct =
    productOrRaw && typeof productOrRaw === 'object' && !Array.isArray(productOrRaw);
  const values = isProduct
    ? [
        ...subCategoryValues(productOrRaw.subCategory ?? productOrRaw.subcategory),
        ...subCategoryValues(productOrRaw.brand),
      ]
    : subCategoryValues(productOrRaw);

  const targets = [target, ...extraLabels].map(slugifySubCategory).filter(Boolean);
  if (!targets.length) return true;
  if (!values.length) return false;

  // Also allow raw substring match on the full joined string (legacy rule)
  const joined = values.join(', ').toLowerCase();
  const joinedSlug = slugifySubCategory(joined);

  return values.some((v) => {
    const slug = slugifySubCategory(v);
    const spaced = String(v).toLowerCase().replace(/-/g, ' ');
    const rawLower = String(v).toLowerCase();
    return targets.some((t) => {
      const tSpaced = t.replace(/-/g, ' ');
      return (
        slug === t ||
        slug.includes(t) ||
        t.includes(slug) ||
        spaced.includes(tSpaced) ||
        tSpaced.includes(spaced) ||
        rawLower.includes(t) ||
        rawLower.includes(tSpaced) ||
        joined.includes(t) ||
        joined.includes(tSpaced) ||
        joinedSlug.includes(t)
      );
    });
  });
};

export const hasSubCategoryOption = (selected, optionValue, optionLabel) =>
  productMatchesSubCategory(selected, optionValue, [optionLabel]);

/** Submit as comma-separated slugs for API + URL filter compatibility. */
export const subCategoryToPayload = (raw) =>
  subCategoryValues(raw)
    .map((s) => slugifySubCategory(s) || s.trim())
    .filter(Boolean)
    .join(', ');
