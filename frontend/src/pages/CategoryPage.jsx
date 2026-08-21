import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import { productAPI, categoriesAPI } from '../utils/api';
import { productMatchesSubCategory } from '../utils/subCategory';

const CategoryPage = () => {
  const { slug } = useParams();
  const location = useLocation();

  // State for Data
  const [allProducts, setAllProducts] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [products, setProducts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('');
  const [navCategories, setNavCategories] = useState([]);

  // State for Pagination & Filters
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    priceRange: null,
    brands: [],
    sizes: [],
    sortBy: null,
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Get subCategory from query params
  const urlParams = new URLSearchParams(location.search);
  const subCategoryParam = urlParams.get('subCategory');

  // Fetch nav categories
  useEffect(() => {
    const fetchNav = async () => {
      try {
        const res = await categoriesAPI.getCategories();
        if (res.success && res.data?.categories?.length) {
          setNavCategories(res.data.categories);
        }
      } catch (e) {
        console.error('Failed to load nav categories:', e);
      }
    };
    fetchNav();
  }, []);

  // Find current category from navCategories
  const currentCategory = useMemo(() => {
    if (!slug || !navCategories.length) return null;
    return navCategories.find((cat) => cat.id === slug || cat.slug === slug || cat.path === `/${slug}`);
  }, [slug, navCategories]);

  // Set page title based on category and subcategory
  useEffect(() => {
    if (currentCategory) {
      if (subCategoryParam) {
        const subItem = currentCategory.subItems?.find(
          (sub) => sub.path?.includes(`subCategory=${subCategoryParam}`)
        );
        const subName = subItem?.name || subCategoryParam.charAt(0).toUpperCase() + subCategoryParam.slice(1);
        setPageTitle(`${currentCategory.label} - ${subName}`);
      } else {
        setPageTitle(currentCategory.label);
      }
    } else if (slug) {
      setPageTitle(slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }
  }, [currentCategory, subCategoryParam, slug]);

  // Fetch products (re-run when nav category resolves so company labels match filters)
  useEffect(() => {
    fetchProducts();
    setFilters({
      priceRange: null,
      brands: [],
      sizes: [],
      sortBy: null,
    });
  }, [slug, location.search, currentCategory?.slug]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);

      const params = { limit: 1000 };
      if (slug) params.category = slug;
      // Bypass backend regex restriction to support multi-subcategory products
      // if (subCategoryParam) params.subCategory = subCategoryParam;

      const response = await productAPI.getProducts(slug, params);

      if (response && response.success) {
        let productsList = response.data.products || [];
        
        // Hide inactive products (Live on Site = off)
        productsList = productsList.filter((p) => p.isActive !== false);

        if (subCategoryParam && productsList.length > 0) {
          const subName = currentCategory?.subItems?.find(
            (sub) => sub.path?.includes(`subCategory=${subCategoryParam}`)
          )?.name;
          productsList = productsList.filter((p) =>
            productMatchesSubCategory(p, subCategoryParam, subName ? [subName] : [])
          );
        }
        setAllProducts(productsList);
      } else {
        setAllProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setAllProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Logic
  useEffect(() => {
    let filtered = [...allProducts];

    if (filters.priceRange) {
      filtered = filtered.filter((product) => {
        const price = product.price || product.finalPrice;
        const { min, max } = filters.priceRange;
        return price >= min && (max === Infinity || price <= max);
      });
    }

    if (filters.brands && filters.brands.length > 0) {
      filtered = filtered.filter((product) => filters.brands.includes(product.brand));
    }

    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter((product) => {
        if (!product.sizes || !Array.isArray(product.sizes)) return false;
        return filters.sizes.some((size) => product.sizes.includes(size));
      });
    }

    filtered.sort((a, b) => {
      const priceA = a.price || a.finalPrice || 0;
      const priceB = b.price || b.finalPrice || 0;

      if (!filters.sortBy || filters.sortBy === 'default') {
        return priceA - priceB;
      }

      switch (filters.sortBy) {
        case 'price-low-high':
          return priceA - priceB;
        case 'price-high-low':
          return priceB - priceA;
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return priceA - priceB;
      }
    });

    setFilteredList(filtered);
    setPage(1);
  }, [allProducts, filters]);

  // Pagination
  const itemsPerPage = 24;
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  useEffect(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setProducts(filteredList.slice(startIndex, endIndex));
  }, [filteredList, page, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      // Scroll product area to top
      const productArea = document.getElementById('product-scroll-area');
      if (productArea) productArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page <= 3) {
        for (let i = 2; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const normalizeProduct = (product) => {
    let images = product.images;
    if (images && !Array.isArray(images) && typeof images === 'object') {
      const keys = Object.keys(images).filter(
        (k) => images[k] && typeof images[k] === 'string' && images[k].trim() !== ''
      );
      keys.sort(
        (a, b) =>
          (parseInt(String(a).replace(/\D/g, ''), 10) || 0) -
          (parseInt(String(b).replace(/\D/g, ''), 10) || 0)
      );
      images = keys.map((k) => images[k].trim());
    }
    if (!Array.isArray(images)) images = [];
    if (images.length === 0 && (product.image || product.thumbnail)) {
      images = [product.image || product.thumbnail].filter(Boolean);
    }
    const firstImage = images[0] || product.image || product.thumbnail;
    return {
      ...product,
      id: product._id || product.id,
      images,
      image: firstImage,
      price: product.price || product.finalPrice,
      originalPrice: product.originalPrice || product.mrp || 0,
      rating: product.rating || 0,
      reviews: product.reviewsCount || product.reviews || 0,
      category: product.category,
    };
  };

  // Subcategory strip
  const categoryStrip = useMemo(() => {
    if (!currentCategory || !currentCategory.subItems?.length) return null;
    return {
      label: currentCategory.label,
      path: currentCategory.path,
      subItems: currentCategory.subItems,
    };
  }, [currentCategory]);

  const brands = useMemo(() => {
    const brandSet = new Set();
    allProducts.forEach((product) => {
      if (product.brand) brandSet.add(product.brand);
    });
    return Array.from(brandSet).sort();
  }, [allProducts]);

  const sizes = useMemo(() => {
    const sizeSet = new Set();
    allProducts.forEach((product) => {
      if (product.sizes && Array.isArray(product.sizes)) {
        product.sizes.forEach((size) => sizeSet.add(size));
      }
    });
    return Array.from(sizeSet).sort();
  }, [allProducts]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      priceRange: null,
      brands: [],
      sizes: [],
      sortBy: null,
    });
  };

  // Note:
  // Some categories can be present in products but not in navCategories from backend.
  // Don't block the page in that case; products are fetched by slug anyway.

  return (
    <div className="min-h-[calc(100vh-110px)] md:h-[calc(100vh-110px)] bg-brown-50 flex flex-col md:flex-row">
      {/* Left Sidebar - Fixed/Sticky */}
      <div className="hidden lg:block w-72 flex-shrink-0 border-r border-brown-200 bg-brown-50 overflow-y-auto">
        <div className="p-4">
          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            onCloseMobile={() => setShowMobileFilters(false)}
            brands={brands}
            sizes={sizes}
          />
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
          <div 
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-100 z-10">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Filter Content */}
            <div className="p-4">
              <FilterSidebar
                filters={filters}
                onFilterChange={(newFilters) => {
                  handleFilterChange(newFilters);
                }}
                onClearFilters={() => {
                  handleClearFilters();
                }}
                brands={brands}
                sizes={sizes}
                isMobile={true}
              />
            </div>
            {/* Apply Button */}
            <div className="sticky bottom-0 p-4 bg-white border-t border-gray-100">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Content - Scrollable (min-w-0 so nested horizontal scroll works in flex row on desktop) */}
      <div id="product-scroll-area" className="flex-1 min-w-0 md:overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header with Title, Count, Filter Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isLoading && !pageTitle ? 'Loading...' : pageTitle}
              </h1>
              {!isLoading && filteredList.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, filteredList.length)} of {filteredList.length} products
                </p>
              )}
            </div>

            {/* Filter Toggle - Mobile Only */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>

          {/* Subcategory Strip */}
          {categoryStrip && (
            <div className="mb-6 min-w-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-nowrap gap-3 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide touch-pan-x">
                <Link
                  to={categoryStrip.path}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all whitespace-nowrap
                    ${!subCategoryParam
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                >
                  All
                </Link>
                {categoryStrip.subItems.map((sub, idx) => {
                  const isActive = sub.path && location.pathname + location.search === sub.path;
                  return (
                    <Link
                      key={idx}
                      to={sub.path || '#'}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all whitespace-nowrap
                        ${isActive
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      {sub.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product._id || product.id} product={normalizeProduct(product)} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </span>
                    </button>

                    {getPageNumbers().map((pageNum, index) => {
                      if (pageNum === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`min-w-[40px] px-3 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                            page === pageNum
                              ? 'bg-gray-900 text-white border-gray-900 shadow-lg'
                              : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="flex items-center gap-1">
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  </div>

                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">No products found.</p>
              {filters.priceRange || filters.brands?.length > 0 || filters.sizes?.length > 0 ? (
                <button
                  onClick={handleClearFilters}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear filters to see all products
                </button>
              ) : (
                <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
                  ← Back to Home
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;
