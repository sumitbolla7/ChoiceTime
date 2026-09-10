import { uploadImageToCloudinary } from '../utils/cloudinary';
import { emptyAdminColorVariant } from '../utils/colorVariants';

const hexForColorInput = (hex) => {
  const h = String(hex || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(h)) return h;
  if (/^#[0-9a-f]{3}$/i.test(h)) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return '#000000';
};

const ColorVariantsEditor = ({ variants, onChange }) => {
  const list =
    Array.isArray(variants) && variants.length > 0 ? variants : [emptyAdminColorVariant()];

  const commit = (next) => onChange(next);

  const updateAt = (idx, patch) => {
    const next = list.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    commit(next);
  };

  const addImages = (idx, urls) => {
    const current = list[idx] || emptyAdminColorVariant();
    const images = [...(current.images || [])];
    urls.forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
    updateAt(idx, { images, image: images[0] || '' });
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <label className="block text-xs font-semibold text-gray-800 mb-1">
        Color-Specific Image Variants (Amazon / Flipkart Style)
      </label>
      <p className="text-xs text-gray-500 mb-2">
        Each color needs a name and at least one image. Optional hex, stock, and price fall back to the product defaults if left blank.
      </p>
      {list.map((variant, idx) => (
        <div key={idx} className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={variant.color || ''}
              onChange={(e) => updateAt(idx, { color: e.target.value })}
              className="w-full sm:w-1/3 border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Color name (e.g. Black)"
            />
            <div className="flex items-center gap-2 sm:w-1/4">
              <input
                type="color"
                value={hexForColorInput(variant.hex)}
                onChange={(e) => updateAt(idx, { hex: e.target.value })}
                className="h-9 w-10 border rounded cursor-pointer p-0.5 bg-white"
                title="Swatch color"
              />
              <input
                type="text"
                value={variant.hex || ''}
                onChange={(e) => updateAt(idx, { hex: e.target.value })}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                placeholder="#000000"
              />
            </div>
            <input
              type="number"
              min="0"
              value={variant.stock ?? ''}
              onChange={(e) => updateAt(idx, { stock: e.target.value })}
              className="w-full sm:w-24 border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Stock"
            />
            <input
              type="number"
              min="0"
              value={variant.price ?? ''}
              onChange={(e) => updateAt(idx, { price: e.target.value })}
              className="w-full sm:w-28 border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Price"
            />
            <button
              type="button"
              onClick={() => commit(list.filter((_, i) => i !== idx))}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded self-start"
              title="Remove color variant"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(variant.images || []).map((url, imgIdx) => (
              <div key={`${url}-${imgIdx}`} className="relative">
                <img src={url} alt="" className="w-12 h-12 object-cover rounded border border-gray-300" />
                <button
                  type="button"
                  onClick={() => {
                    const images = (variant.images || []).filter((_, i) => i !== imgIdx);
                    updateAt(idx, { images, image: images[0] || '' });
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-4"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="cursor-pointer px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm">
              <span>Upload images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = '';
                  if (!files.length) return;
                  try {
                    const urls = [];
                    for (const file of files) {
                      const res = await uploadImageToCloudinary(file);
                      if (res.success && res.url) urls.push(res.url);
                    }
                    if (urls.length) addImages(idx, urls);
                  } catch {
                    alert('Image upload failed. Please try again.');
                  }
                }}
              />
            </label>
            <input
              type="text"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const url = e.currentTarget.value.trim();
                  if (url) {
                    addImages(idx, [url]);
                    e.currentTarget.value = '';
                  }
                }
              }}
              className="flex-1 min-w-[180px] border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Or paste image URL and press Enter"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...list, emptyAdminColorVariant()])}
        className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
      >
        + Add Color Image Variant
      </button>
    </div>
  );
};

export default ColorVariantsEditor;
