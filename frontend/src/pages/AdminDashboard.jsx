import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  uploadVideoToCloudinary,
  uploadImageToCloudinary,
  MAX_PRODUCT_IMAGE_BYTES,
} from '../utils/cloudinary';
import {
  slugifySubCategory,
  subCategoryValues,
  productMatchesSubCategory,
  hasSubCategoryOption,
  subCategoryToPayload,
} from '../utils/subCategory';

const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// SVG Icons
const IconDashboard = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconProducts = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const IconAdd = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconDelete = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconOrders = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const IconUsers = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconCategories = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const IconHome = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconReels = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const IconCoupon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

const IconShippingReturns = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h10" />
  </svg>
);

const IconReturnOrders = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-3m0 0v-3m0 3h3m-3 0h-3m-2-5a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconReviews = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

// Sidebar menu items
const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { id: 'products', label: 'View Products', icon: IconProducts },
  { id: 'add-product', label: 'Add Product', icon: IconAdd },
  { id: 'categories', label: 'Nav Categories', icon: IconCategories },
  { id: 'home-reels', label: 'Home Page Reels', icon: IconReels },
  { id: 'orders', label: 'Manage Orders', icon: IconOrders },
  { id: 'coupons', label: 'Coupons', icon: IconCoupon },
  { id: 'shipping-returns', label: 'Shipping & Returns', icon: IconShippingReturns },
  { id: 'return-orders', label: 'Return Order Management', icon: IconReturnOrders },
  { id: 'reviews', label: 'Review Management', icon: IconReviews },
  { id: 'users', label: 'Manage Users', icon: IconUsers },
];

const AdminDashboard = () => {
  const { user, isLoading } = useAuth();
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [productCategory, setProductCategory] = useState('men');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [stockFilter, setStockFilter] = useState('all'); // all | in | out
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    category: 'men',
    name: '',
    brand: '',
    price: '',
    originalPrice: '',
    discountPercent: 0,
    subCategory: [],
    stock: 10,
    images: '',
    description: '',
    isNewArrival: false,
    onSale: false,
    isFeatured: false,
    isActive: true,
    // Watch specific fields
    model: '',
    functions: '',
    dialColor: '',
    dialSize: '',
    strapColor: '',
    strapMaterial: '',
    crystalMaterial: '',
    lockType: '',
    waterResistance: '',
    calendarType: '',
    movement: '',
    itemWeight: '',
    quality: '',
    warranty: '',
    colorOptions: '',
    colorVariants: [],
    boxOptions: [{ name: '', price: '' }],
    pageNumberAll: '',
    pageNumberCategory: '',
  });
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const imageInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [navCategories, setNavCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', order: 0 });
  const [editingCategory, setEditingCategory] = useState(null);
  const [subItemInputs, setSubItemInputs] = useState([{ name: '' }]);
  
  // Reels state
  const [reels, setReels] = useState([]);
  const [reelForm, setReelForm] = useState({
    title: '',
    videoUrl: '',
    thumbnailUrl: '',
    productLink: '',
    isActive: true,
    order: 0
  });
  const [editingReel, setEditingReel] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef(null);

  // Coupon state
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: '1',
    expiryDate: '',
    isActive: true,
    forNewUsers: false,
    forExistingUsers: false,
  });
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [successPopup, setSuccessPopup] = useState({ show: false, text: '' });
  const [scratchCardPopupActive, setScratchCardPopupActive] = useState(true);
  const [scratchCardPopupUpdating, setScratchCardPopupUpdating] = useState(false);

  // Shipping & Returns (product page policies)
  const [shippingReturnsPolicies, setShippingReturnsPolicies] = useState([]);
  const [shippingReturnForm, setShippingReturnForm] = useState({
    title: '',
    description: '',
    iconColor: 'green',
    order: 0,
  });
  const [editingShippingReturn, setEditingShippingReturn] = useState(null);
  const [loadingShippingReturns, setLoadingShippingReturns] = useState(false);
  const [orderTimeline, setOrderTimeline] = useState({
    deliveryDaysMin: 5,
    deliveryDaysMax: 7,
    steps: [
      { label: 'Order confirmed', timeEstimate: 'Just now' },
      { label: 'Processing', timeEstimate: 'Within 24hrs' },
      { label: 'Shipped', timeEstimate: '2-3 days' },
      { label: 'Delivered', timeEstimate: 'On delivery date' },
    ],
  });
  const [orderTimelineSaving, setOrderTimelineSaving] = useState(false);
  const [shippingConfig, setShippingConfig] = useState({
    freeShippingThreshold: 2000,
    shippingCharge: 50,
  });
  const [shippingConfigSaving, setShippingConfigSaving] = useState(false);

  // Return order management
  const [returnRequests, setReturnRequests] = useState([]);
  const [returnUpdatingId, setReturnUpdatingId] = useState(null);
  const [returnAdminNotes, setReturnAdminNotes] = useState({});
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('all');
  const [reviewSortBy, setReviewSortBy] = useState('newest');

  // Manage Orders: selected order for detail view (modal)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [parcelGuruRefDraft, setParcelGuruRefDraft] = useState('');
  const [parcelGuruRefSaving, setParcelGuruRefSaving] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const filteredProductsBySearch = useMemo(() => {
    const list = products || [];
    const q = (productSearchQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const name = (p.name || p.title || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const sub = (p.subCategory || p.subcategory || '').toLowerCase();
      const priceStr = String(p.price || p.finalPrice || '');
      return name.includes(q) || brand.includes(q) || sub.includes(q) || priceStr.includes(q);
    });
  }, [products, productSearchQuery]);

  const filteredOrdersForSearch = useMemo(() => {
    const list = orders || [];
    const q = (orderSearchQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => {
      const id = (o._id || '').toLowerCase();
      const name = (o.user?.name || '').toLowerCase();
      const email = (o.user?.email || '').toLowerCase();
      const status = (o.status || '').toLowerCase();
      const totalStr = String(o.totalAmount || '');
      const dateStr = o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toLowerCase() : '';
      return id.includes(q) || name.includes(q) || email.includes(q) || status.includes(q) || totalStr.includes(q) || dateStr.includes(q);
    });
  }, [orders, orderSearchQuery]);

  useEffect(() => {
    if (!selectedOrderDetail) {
      setParcelGuruRefDraft('');
      return;
    }
    setParcelGuruRefDraft(
      (selectedOrderDetail.parcelGuru && selectedOrderDetail.parcelGuru.orderReference) ||
        String(selectedOrderDetail._id || '')
    );
  }, [selectedOrderDetail]);

  const showSuccessPopup = (text) => {
    setSuccessPopup({ show: true, text });
    setTimeout(() => setSuccessPopup({ show: false, text: '' }), 2500);
  };

  const isAdmin = user?.isAdmin;

  // Parse query from path (e.g. /watches?gender=men&subCategory=analog) — defined early for useMemos below
  const getParamsFromPath = (path) => {
    if (!path || !path.includes('?')) return { gender: '', subCategory: '' };
    const q = path.split('?')[1] || '';
    const p = new URLSearchParams(q);
    return { gender: p.get('gender') || '', subCategory: p.get('subCategory') || '' };
  };
  const getSubCategoryFromPath = (path) => getParamsFromPath(path).subCategory;

  useEffect(() => {
    if (!isAdmin) return;
    if (activeSection === 'dashboard' || activeSection === 'orders') {
      fetchSummary();
      fetchOrders();
    }
    if (activeSection === 'orders') {
      fetchShippingConfig();
    }
    if (activeSection === 'products' || activeSection === 'add-product' || activeSection === 'edit-product') {
      fetchProducts(productCategory);
      setSelectedSubCategory(''); // Reset subcategory filter when category changes
    }
    if (activeSection === 'users') {
      fetchUsers();
    }
    if (activeSection === 'categories' || activeSection === 'add-product' || activeSection === 'edit-product' || activeSection === 'products') {
      fetchNavCategories();
    }
    if (activeSection === 'home-reels') {
      fetchReels();
    }
    if (activeSection === 'coupons') {
      fetchCoupons();
      fetchScratchCardPopupSetting();
    }
    if (activeSection === 'shipping-returns') {
      fetchShippingReturns();
      fetchOrderTimeline();
      fetchShippingConfig();
    }
    if (activeSection === 'return-orders') {
      fetchReturnRequests();
    }
    if (activeSection === 'reviews') {
      fetchAdminReviews();
    }
  }, [isAdmin, activeSection, productCategory]);

  // For View Products: get subcategory options from the selected nav category
  const selectedNavForViewProducts = useMemo(
    () => (productCategory ? navCategories.find((c) => c.slug === productCategory) : null),
    [navCategories, productCategory]
  );

  const viewSubCategoryOptionsFromNav = useMemo(() => {
    if (!selectedNavForViewProducts?.subItems?.length) return [];
    return selectedNavForViewProducts.subItems.map((si) => ({
      label: si.name,
      value: getSubCategoryFromPath(si.path) || slugifySubCategory(si.name),
    }));
  }, [selectedNavForViewProducts]);

  // When View Products uses nav categories, default to first nav category if current selection is not a nav slug
  useEffect(() => {
    if (
      activeSection !== 'products' ||
      navCategories.length === 0 ||
      !productCategory ||
      navCategories.some((c) => c.slug === productCategory)
    )
      return;
    setProductCategory(navCategories[0].slug);
  }, [activeSection, navCategories, productCategory]);

  const fetchSummary = async () => {
    try {
      const response = await adminAPI.getSummary();
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await adminAPI.getOrders();
      if (response.success) {
        setOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchProducts = async (category) => {
    try {
      setLoading(true);
      const response = await adminAPI.getProducts(category);
      if (response.success) {
        setProducts(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers();
      if (response.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnRequests = async () => {
    try {
      const res = await adminAPI.getReturns();
      if (res?.success && Array.isArray(res.data?.returns)) {
        setReturnRequests(res.data.returns);
      } else {
        setReturnRequests([]);
      }
    } catch (e) {
      console.error('Error fetching return requests:', e);
      setMessage({ type: 'error', text: e?.message || 'Failed to fetch return requests' });
      setReturnRequests([]);
    }
  };

  const fetchAdminReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await adminAPI.getReviews();
      if (response?.success) {
        setReviews(response.data?.reviews || []);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to fetch reviews' });
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleUpdateReturnStatus = async (id, status, adminNotes) => {
    try {
      setReturnUpdatingId(id);
      await adminAPI.updateReturnStatus(id, { status, adminNotes: adminNotes || undefined });
      showSuccessPopup('Return status updated.');
      await fetchReturnRequests();
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Failed to update return status' });
    } finally {
      setReturnUpdatingId(null);
    }
  };

  const fetchNavCategories = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getCategories();
      if (response.success) {
        setNavCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to fetch categories' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReels = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getReels();
      if (response.success) {
        const raw = response.data?.reels;
        const list = Array.isArray(raw) ? raw : [];
        setReels(
          list.map((r) => ({
            ...r,
            _id: r?._id != null ? String(r._id) : r?.id != null ? String(r.id) : '',
          })).filter((r) => r._id)
        );
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to fetch reels' });
    } finally {
      setLoading(false);
    }
  };

  const resetReelForm = () => {
    setReelForm({
      title: '',
      videoUrl: '',
      thumbnailUrl: '',
      productLink: '',
      isActive: true,
      order: 0
    });
    setEditingReel(null);
  };

  const handleReelFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setReelForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateReel = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...reelForm,
        order: Number(reelForm.order) || 0,
        isActive: Boolean(reelForm.isActive),
      };
      const response = await adminAPI.createReel(payload);
      if (response.success) {
        setMessage({ type: 'success', text: 'Reel added successfully!' });
        resetReelForm();
        fetchReels();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to add reel' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to add reel' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReel = async (e) => {
    e.preventDefault();
    if (!editingReel) return;
    const reelId =
      editingReel._id != null && editingReel._id !== ''
        ? String(editingReel._id)
        : editingReel.id != null
          ? String(editingReel.id)
          : '';
    if (!reelId) {
      setMessage({ type: 'error', text: 'Cannot update reel: missing id.' });
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...reelForm,
        order: Number(reelForm.order) || 0,
        isActive: Boolean(reelForm.isActive),
      };
      const response = await adminAPI.updateReel(reelId, payload);
      if (response.success) {
        setMessage({ type: 'success', text: 'Reel updated successfully!' });
        resetReelForm();
        fetchReels();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update reel' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update reel' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reel?')) return;
    try {
      setLoading(true);
      const response = await adminAPI.deleteReel(id);
      if (response.success) {
        setMessage({ type: 'success', text: 'Reel deleted successfully!' });
        fetchReels();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete reel' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete reel' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReelStatus = async (id) => {
    try {
      const response = await adminAPI.toggleReelStatus(id);
      if (response.success) {
        fetchReels();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to toggle reel status' });
    }
  };

  const handleEditReel = (reel) => {
    const id =
      reel?._id != null && reel._id !== ''
        ? String(reel._id)
        : reel?.id != null
          ? String(reel.id)
          : '';
    if (!id) {
      setMessage({ type: 'error', text: 'Cannot edit this reel (missing id). Try refreshing the page.' });
      return;
    }
    setEditingReel({ ...reel, _id: id });
    setReelForm({
      title: reel.title || '',
      videoUrl: reel.videoUrl || '',
      thumbnailUrl: reel.thumbnailUrl || '',
      productLink: reel.productLink || '',
      isActive: reel.isActive !== false,
      order: reel.order ?? 0,
    });
    window.requestAnimationFrame(() => {
      document.getElementById('admin-reel-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setMessage({ type: 'error', text: 'Please select a video file' });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Video size should be less than 100MB' });
      return;
    }

    try {
      setVideoUploading(true);
      setUploadProgress(0);
      
      const result = await uploadVideoToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        setReelForm(prev => ({ ...prev, videoUrl: result.url }));
        setMessage({ type: 'success', text: 'Video uploaded successfully!' });
      }
    } catch (error) {
      console.error('Video upload error:', error);
      setMessage({ type: 'error', text: 'Failed to upload video. Please try again.' });
    } finally {
      setVideoUploading(false);
      setUploadProgress(0);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  // ========== COUPON FUNCTIONS ==========
  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const response = await adminAPI.getCoupons();
      if (response.success) setCoupons(response.data.coupons || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load coupons' });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const fetchScratchCardPopupSetting = async () => {
    try {
      const res = await adminAPI.getScratchCardPopupActive();
      if (res?.success && typeof res?.data?.active === 'boolean') setScratchCardPopupActive(res.data.active);
    } catch (e) {
      console.error('Fetch scratch card popup setting:', e);
    }
  };

  const handleToggleScratchCardPopup = async () => {
    const next = !scratchCardPopupActive;
    setScratchCardPopupUpdating(true);
    try {
      await adminAPI.updateScratchCardPopupActive(next);
      setScratchCardPopupActive(next);
      showSuccessPopup(next ? 'Scratch & Win popup is now active.' : 'Scratch & Win popup is now inactive.');
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Failed to update' });
    } finally {
      setScratchCardPopupUpdating(false);
    }
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxDiscount: '',
      usageLimit: '',
      perUserLimit: '1',
      expiryDate: '',
      isActive: true,
      forNewUsers: false,
      forExistingUsers: false,
    });
    setEditingCoupon(null);
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.discountValue) {
      setMessage({ type: 'error', text: 'Code and discount value are required' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
        minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : 0,
        maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : null,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
        perUserLimit: couponForm.perUserLimit ? Number(couponForm.perUserLimit) : 1,
        expiryDate: couponForm.expiryDate || null,
      };

      let response;
      if (editingCoupon) {
        response = await adminAPI.updateCoupon(editingCoupon._id, payload);
      } else {
        response = await adminAPI.createCoupon(payload);
      }

      if (response.success) {
        setMessage({ type: 'success', text: editingCoupon ? 'Coupon updated!' : 'Coupon created!' });
        resetCouponForm();
        fetchCoupons();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save coupon' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : '',
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      perUserLimit: coupon.perUserLimit ? String(coupon.perUserLimit) : '1',
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      isActive: coupon.isActive,
      forNewUsers: coupon.forNewUsers || false,
      forExistingUsers: coupon.forExistingUsers || false,
    });
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const response = await adminAPI.deleteCoupon(id);
      if (response.success) {
        setMessage({ type: 'success', text: 'Coupon deleted!' });
        fetchCoupons();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete coupon' });
    }
  };

  const handleToggleCoupon = async (id) => {
    try {
      const response = await adminAPI.toggleCoupon(id);
      if (response.success) fetchCoupons();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to toggle coupon' });
    }
  };

  // ========== SHIPPING & RETURNS FUNCTIONS ==========
  const fetchShippingReturns = async () => {
    setLoadingShippingReturns(true);
    try {
      const response = await adminAPI.getShippingReturns();
      if (response.success) setShippingReturnsPolicies(response.data?.policies || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load Shipping & Returns' });
    } finally {
      setLoadingShippingReturns(false);
    }
  };

  const fetchOrderTimeline = async () => {
    try {
      const res = await adminAPI.getOrderTimeline();
      if (res?.success && res?.data) {
        const d = res.data;
        const defaultSteps = [
          { label: 'Order confirmed', timeEstimate: 'Just now' },
          { label: 'Processing', timeEstimate: 'Within 24hrs' },
          { label: 'Shipped', timeEstimate: '2-3 days' },
          { label: 'Delivered', timeEstimate: 'On delivery date' },
        ];
        setOrderTimeline({
          deliveryDaysMin: d.deliveryDaysMin ?? 5,
          deliveryDaysMax: d.deliveryDaysMax ?? 7,
          steps: Array.isArray(d.steps) && d.steps.length ? d.steps : defaultSteps,
        });
      }
    } catch (e) {
      console.error('Fetch order timeline:', e);
    }
  };

  const fetchShippingConfig = async () => {
    try {
      const res = await adminAPI.getShippingConfig();
      if (res?.success && res?.data) {
        setShippingConfig({
          freeShippingThreshold: Number(res.data.freeShippingThreshold ?? 2000) || 2000,
          shippingCharge: Number(res.data.shippingCharge ?? 50) || 0,
        });
      }
    } catch (e) {
      console.error('Fetch shipping config:', e);
    }
  };

  const handleSaveOrderTimeline = async (e) => {
    e.preventDefault();
    setOrderTimelineSaving(true);
    try {
      await adminAPI.updateOrderTimeline(orderTimeline);
      showSuccessPopup('Order timeline saved. It will reflect on the Order Success page.');
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save order timeline' });
    } finally {
      setOrderTimelineSaving(false);
    }
  };

  const handleSaveShippingConfig = async (e) => {
    e.preventDefault();
    setShippingConfigSaving(true);
    try {
      await adminAPI.updateShippingConfig({
        freeShippingThreshold: Number(shippingConfig.freeShippingThreshold) || 0,
        shippingCharge: Number(shippingConfig.shippingCharge) || 0,
      });
      showSuccessPopup('Shipping settings saved. Cart and checkout will use new values.');
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save shipping settings' });
    } finally {
      setShippingConfigSaving(false);
    }
  };

  const resetShippingReturnForm = () => {
    setShippingReturnForm({ title: '', description: '', iconColor: 'green', order: shippingReturnsPolicies?.length || 0 });
    setEditingShippingReturn(null);
  };

  const handleCreateOrUpdateShippingReturn = async (e) => {
    e.preventDefault();
    if (!shippingReturnForm.title?.trim() || !shippingReturnForm.description?.trim()) {
      setMessage({ type: 'error', text: 'Title and description are required' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: shippingReturnForm.title.trim(),
        description: shippingReturnForm.description.trim(),
        iconColor: shippingReturnForm.iconColor,
        order: Number(shippingReturnForm.order) || 0,
      };
      if (editingShippingReturn) {
        await adminAPI.updateShippingReturn(editingShippingReturn._id, payload);
        setMessage({ type: 'success', text: 'Policy updated!' });
      } else {
        await adminAPI.createShippingReturn(payload);
        setMessage({ type: 'success', text: 'Policy added!' });
      }
      resetShippingReturnForm();
      fetchShippingReturns();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditShippingReturn = (policy) => {
    setEditingShippingReturn(policy);
    setShippingReturnForm({
      title: policy.title,
      description: policy.description,
      iconColor: policy.iconColor || 'green',
      order: policy.order ?? 0,
    });
  };

  const handleDeleteShippingReturn = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await adminAPI.deleteShippingReturn(id);
      setMessage({ type: 'success', text: 'Policy deleted!' });
      fetchShippingReturns();
      if (editingShippingReturn?._id === id) resetShippingReturnForm();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete' });
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', order: 0 });
    setSubItemInputs([{ name: '' }]);
    setEditingCategory(null);
  };

  // For Add/Edit Product: category and subcategory options from Nav Categories
  const productCategoryOptionsFromNav = useMemo(
    () => navCategories.map((cat) => ({ label: cat.name, value: cat.slug })),
    [navCategories]
  );
  const selectedNavCategoryForProduct = useMemo(
    () => (productForm.category ? navCategories.find((c) => c.slug === productForm.category) : null),
    [navCategories, productForm.category]
  );
  const productSubCategoryOptionsFromNav = useMemo(() => {
    if (!selectedNavCategoryForProduct?.subItems?.length) return [];
    return selectedNavCategoryForProduct.subItems.map((si) => ({
      label: si.name,
      value: getSubCategoryFromPath(si.path) || slugifySubCategory(si.name),
    }));
  }, [selectedNavCategoryForProduct]);

  // Fetch unique brands/subcategories from existing products for the selected category
  const [availableBrands, setAvailableBrands] = useState([]);
  const [isCustomBrand, setIsCustomBrand] = useState(false);

  useEffect(() => {
    const fetchBrandsForCategory = async () => {
      if (!productForm.category) { setAvailableBrands([]); return; }
      try {
        const response = await adminAPI.getProducts(productForm.category);
        if (response.success && response.data?.products) {
          const brands = [...new Set(
            response.data.products
              .map((p) => (p.brand || '').trim())
              .filter(Boolean)
          )].sort();
          setAvailableBrands(brands);
        }
      } catch (e) {
        console.error('Error fetching brands:', e);
      }
    };
    if (activeSection === 'add-product' || activeSection === 'edit-product') {
      fetchBrandsForCategory();
    }
  }, [productForm.category, activeSection]);

  const handleCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubItemRow = () => {
    setSubItemInputs((prev) => [...prev, { name: '' }]);
  };

  const handleSubItemChange = (index, field, value) => {
    setSubItemInputs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveSubItem = (index) => {
    setSubItemInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const subItems = subItemInputs
      .filter((s) => (s.name || '').trim())
      .map((s) => ({ name: (s.name || '').trim() }));
    try {
      await adminAPI.createCategory({
        name: (categoryForm.name || '').trim(),
        order: Number(categoryForm.order) || 0,
        subItems,
      });
      setMessage({ type: 'success', text: 'Category added' });
      resetCategoryForm();
      fetchNavCategories();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create category' });
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, order: cat.order ?? 0 });
    setSubItemInputs(
      (cat.subItems && cat.subItems.length)
        ? cat.subItems.map((s) => ({ name: s.name }))
        : [{ name: '' }]
    );
    setActiveSection('categories');
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    const subItems = subItemInputs
      .filter((s) => (s.name || '').trim())
      .map((s) => ({ name: (s.name || '').trim() }));
    try {
      await adminAPI.updateCategory(editingCategory._id, {
        name: (categoryForm.name || '').trim(),
        order: Number(categoryForm.order) || 0,
        subItems,
      });
      setMessage({ type: 'success', text: 'Category updated' });
      resetCategoryForm();
      fetchNavCategories();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update category' });
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Remove this nav category? The link will disappear from the site nav.')) return;
    try {
      await adminAPI.deleteCategory(id);
      setMessage({ type: 'success', text: 'Category removed' });
      resetCategoryForm();
      fetchNavCategories();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete category' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      setMessage({ type: 'success', text: 'User deleted successfully' });
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete user' });
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteReview(reviewId);
      setReviews((prev) => (prev || []).filter((review) => review._id !== reviewId));
      setMessage({ type: 'success', text: 'Review deleted successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete review' });
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      await adminAPI.updateOrderStatus(orderId, status);
      setMessage({ type: 'success', text: 'Order status updated' });
      fetchOrders();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update order' });
    }
  };

  const handleSaveParcelGuruReference = async () => {
    if (!selectedOrderDetail?._id) return;
    const ref = parcelGuruRefDraft.trim();
    if (!ref) {
      setMessage({ type: 'error', text: 'ParcelGuru order reference cannot be empty' });
      return;
    }
    setParcelGuruRefSaving(true);
    try {
      const res = await adminAPI.updateOrderParcelGuruReference(selectedOrderDetail._id, ref);
      if (res.success && res.data?.order) {
        setSelectedOrderDetail(res.data.order);
        setMessage({ type: 'success', text: 'ParcelGuru order reference saved' });
        fetchOrders();
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
    } finally {
      setParcelGuruRefSaving(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await adminAPI.deleteOrder(orderId);
      setMessage({ type: 'success', text: 'Order removed' });
      fetchOrders();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete order' });
    }
  };

  const handleProductFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      // Reset subCategory when category changes
      if (name === 'category') {
        updated.subCategory = [];
      }
      // Auto-calculate discount when price or originalPrice changes
      if (name === 'price' || name === 'originalPrice') {
        const price = name === 'price' ? Number(value) : Number(prev.price);
        const originalPrice = name === 'originalPrice' ? Number(value) : Number(prev.originalPrice);
        if (originalPrice > 0 && price > 0 && originalPrice > price) {
          updated.discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        } else if (originalPrice > 0 && price >= originalPrice) {
          updated.discountPercent = 0;
        } else {
          updated.discountPercent = 0;
        }
      }
      // Auto-calculate price when discountPercent changes (if originalPrice exists)
      if (name === 'discountPercent') {
        const originalPrice = Number(prev.originalPrice);
        const discount = Number(value);
        if (originalPrice > 0 && discount >= 0 && discount <= 100) {
          updated.price = Math.round(originalPrice * (1 - discount / 100));
        }
      }
      return updated;
    });
  };

  const resetForm = () => {
    setProductForm({
      category: navCategories.length > 0 ? '' : productCategory,
      name: '',
      brand: '',
      price: '',
      originalPrice: '',
      discountPercent: 0,
      subCategory: [],
      stock: 10,
      images: '',
      description: '',
      isNewArrival: false,
      onSale: false,
      isFeatured: false,
      isActive: true,
      // Watch specific fields
      model: '',
      functions: '',
      dialColor: '',
      dialSize: '',
      strapColor: '',
      strapMaterial: '',
      crystalMaterial: '',
      lockType: '',
      waterResistance: '',
      calendarType: '',
      movement: '',
      itemWeight: '',
      quality: '',
      warranty: '',
      pageNumberAll: '',
      pageNumberCategory: '',
    });
    setEditingProduct(null);
    setUploadedImageUrls([]);
    setIsCustomBrand(false);
    setImageUploading(false);
    setImageUploadProgress(0);
  };

  // Image upload handlers
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setImageUploading(true);
    let completedCount = 0;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: `${file.name}: only image files are allowed.` });
        completedCount++;
        continue;
      }
      if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
        window.alert(
          `"${file.name}" is larger than 1.5 MB.\n\nPlease compress it (Photos app, phone gallery editor, or tinypng.com) and try again.`
        );
        completedCount++;
        continue;
      }
      try {
        setImageUploadProgress(Math.round((completedCount / files.length) * 100));
        const result = await uploadImageToCloudinary(file, (progress) => {
          const overallProgress = Math.round(((completedCount + progress / 100) / files.length) * 100);
          setImageUploadProgress(overallProgress);
        });
        if (result.success) {
          setUploadedImageUrls((prev) => [...prev, result.url]);
        }
        completedCount++;
      } catch (error) {
        console.error('Image upload failed:', error);
        setMessage({ type: 'error', text: `Failed to upload ${file.name}` });
        completedCount++;
      }
    }

    setImageUploading(false);
    setImageUploadProgress(0);
    // Reset file input so same files can be selected again
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleRemoveImage = (index) => {
    setUploadedImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    const price = Number(product.price || product.finalPrice || 0);
    const originalPrice = Number(product.originalPrice || product.price || 0);
    // Calculate discount automatically
    let calculatedDiscount = 0;
    if (originalPrice > 0 && price > 0 && originalPrice > price) {
      calculatedDiscount = Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    setProductForm({
      category: product.category || productCategory,
      name: product.name || '',
      brand: product.brand || '',
      price: price || '',
      originalPrice: originalPrice || '',
      discountPercent: calculatedDiscount,
      subCategory: subCategoryValues(product.subCategory),
      stock: product.stock || 10,
      images: product.images?.join(', ') || '',
      description: product.description || '',
      isNewArrival: product.isNewArrival || false,
      onSale: product.onSale || false,
      isFeatured: product.isFeatured || false,
      isActive: product.isActive !== false,
      colorOptions: product.colorOptions?.join(', ') || '',
      boxOptions: product.boxOptions?.length > 0
        ? product.boxOptions.map((opt) =>
            typeof opt === 'string'
              ? { name: opt, price: '' }
              : { name: opt.name || '', price: opt.price || '' }
          )
        : [{ name: '', price: '' }],
      // Watch specific fields
      model: product.model || '',
      functions: product.functions || '',
      dialColor: product.dialColor || '',
      dialSize: product.dialSize || '',
      strapColor: product.strapColor || '',
      strapMaterial: product.strapMaterial || '',
      crystalMaterial: product.crystalMaterial || '',
      lockType: product.lockType || '',
      waterResistance: product.waterResistance || '',
      calendarType: product.calendarType || '',
      movement: product.movement || '',
      itemWeight: product.itemWeight || '',
      quality: product.quality || '',
      warranty: product.warranty || '',
      pageNumberAll: product.pageNumberAll || '',
      pageNumberCategory: product.pageNumberCategory || '',
    });
    setUploadedImageUrls(product.images?.length ? [...product.images] : []);
    setActiveSection('edit-product');
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category: productForm.category,
        name: productForm.name,
        brand: productForm.brand,
        subCategory: subCategoryToPayload(productForm.subCategory),
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice || productForm.price),
        discountPercent: Number(productForm.discountPercent || 0),
        stock: Number(productForm.stock || 0),
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : [],
        description: productForm.description || '',
        isNewArrival: Boolean(productForm.isNewArrival),
        onSale: Boolean(productForm.onSale),
        isFeatured: Boolean(productForm.isFeatured),
        isActive: productForm.isActive === false ? false : true,
        colorOptions: (() => {
          const fromText = productForm.colorOptions ? productForm.colorOptions.split(',').map((opt) => opt.trim()).filter(Boolean) : [];
          const fromVars = (productForm.colorVariants || []).map(v => v.color).filter(Boolean);
          return Array.from(new Set([...fromText, ...fromVars]));
        })(),
        colorVariants: (productForm.colorVariants || []).filter(v => v && (v.color || v.image)),
        boxOptions: buildBoxOptionsPayload(),
        // Watch specific fields
        model: productForm.model || '',
        functions: productForm.functions || '',
        dialColor: productForm.dialColor || '',
        dialSize: productForm.dialSize || '',
        strapColor: productForm.strapColor || '',
        strapMaterial: productForm.strapMaterial || '',
        crystalMaterial: productForm.crystalMaterial || '',
        lockType: productForm.lockType || '',
        waterResistance: productForm.waterResistance || '',
        calendarType: productForm.calendarType || '',
        movement: productForm.movement || '',
        itemWeight: productForm.itemWeight || '',
        quality: productForm.quality || '',
        warranty: productForm.warranty || '',
        pageNumberAll: Number(productForm.pageNumberAll || 0),
        pageNumberCategory: Number(productForm.pageNumberCategory || 0),
      };
      await adminAPI.createProduct(payload);
      setMessage({ type: 'success', text: 'Product created' });
      showSuccessPopup('Product added successfully!');
      resetForm();
      fetchProducts(productForm.category);
    } catch (error) {
      const detail = error.response?.data?.error || error.response?.data?.message || '';
      setMessage({ type: 'error', text: `${error.message || 'Failed to create product'}${detail ? `: ${detail}` : ''}` });
    }
  };

  // Helper to build boxOptions payload from form state
  const buildBoxOptionsPayload = () => {
    if (!Array.isArray(productForm.boxOptions)) return [];
    return productForm.boxOptions
      .filter((opt) => opt.name && opt.name.trim())
      .map((opt) => ({ name: opt.name.trim(), price: Number(opt.price) || 0 }));
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const payload = {
        category: productForm.category,
        name: productForm.name,
        brand: productForm.brand,
        subCategory: subCategoryToPayload(productForm.subCategory),
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice || productForm.price),
        discountPercent: Number(productForm.discountPercent || 0),
        stock: Number(productForm.stock || 0),
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : [],
        description: productForm.description || '',
        isNewArrival: Boolean(productForm.isNewArrival),
        onSale: Boolean(productForm.onSale),
        isFeatured: Boolean(productForm.isFeatured),
        isActive: productForm.isActive === false ? false : true,
        colorOptions: productForm.colorOptions
          ? productForm.colorOptions.split(',').map((opt) => opt.trim()).filter(Boolean)
          : [],
        boxOptions: buildBoxOptionsPayload(),
        // Watch specific fields
        model: productForm.model || '',
        functions: productForm.functions || '',
        dialColor: productForm.dialColor || '',
        dialSize: productForm.dialSize || '',
        strapColor: productForm.strapColor || '',
        strapMaterial: productForm.strapMaterial || '',
        crystalMaterial: productForm.crystalMaterial || '',
        lockType: productForm.lockType || '',
        waterResistance: productForm.waterResistance || '',
        calendarType: productForm.calendarType || '',
        movement: productForm.movement || '',
        itemWeight: productForm.itemWeight || '',
        quality: productForm.quality || '',
        warranty: productForm.warranty || '',
        pageNumberAll: Number(productForm.pageNumberAll || 0),
        pageNumberCategory: Number(productForm.pageNumberCategory || 0),
      };
      await adminAPI.updateProduct(editingProduct._id, payload);
      setMessage({ type: 'success', text: 'Product updated' });
      resetForm();
      fetchProducts(productForm.category);
      setActiveSection('products');
    } catch (error) {
      const detail = error.response?.data?.error || error.response?.data?.message || '';
      setMessage({ type: 'error', text: `${error.message || 'Failed to update product'}${detail ? `: ${detail}` : ''}` });
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await adminAPI.deleteProduct(id, productCategory);
      setMessage({ type: 'success', text: 'Product deleted' });
      fetchProducts(productCategory);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete product' });
    }
  };

  const filteredOrders = useMemo(() => (orders || []).slice(0, 10), [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brown-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-brown-50 flex items-center justify-center px-4">
        <div className="bg-white border border-brown-200 rounded-2xl shadow-sm max-w-lg w-full p-10 text-center space-y-4">
          <div className="text-4xl">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900">Admin access only</h1>
          <p className="text-gray-600">You need an admin account to view this page.</p>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
          >
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
              <button
                onClick={fetchSummary}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 rounded-lg w-full sm:w-auto"
              >
                Refresh
              </button>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {summary ? (
                <>
                  <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-5 shadow-sm">
                    <p className="text-xs uppercase text-gray-500">Revenue</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                      ₹{(summary.totalRevenue ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-5 shadow-sm">
                    <p className="text-xs uppercase text-gray-500">Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{summary.totalOrders ?? 0}</p>
                    <p className="text-xs text-gray-500">{summary.pendingOrders ?? 0} pending</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-5 shadow-sm">
                    <p className="text-xs uppercase text-gray-500">Customers</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{summary.totalUsers ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-5 shadow-sm">
                    <p className="text-xs uppercase text-gray-500">Total Products</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                      {summary.totalProducts?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">All collections</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Loading summary...</p>
              )}
            </div>

            {/* Category-wise Product Count */}
            {summary && summary.categoryCounts && Object.keys(summary.categoryCounts).length > 0 && (
              <div className="bg-white rounded-2xl border border-brown-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Products by Category</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Object.entries(summary.categoryCounts).map(([category, count]) => (
                    <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs uppercase text-gray-500 mb-1">
                        {category === 'lens' ? 'Lens' :
                         category.charAt(0).toUpperCase() + category.slice(1)}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">{count?.toLocaleString() || 0}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Total Products</p>
                    <p className="text-lg font-bold text-gray-900">
                      {summary.totalProducts?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'products': {
        // Start with search-filtered list, then filter by subcategory if selected
        let filteredProducts = filteredProductsBySearch;
        if (selectedSubCategory) {
          filteredProducts = filteredProducts.filter((product) => {
            const normalizedSelectedSub = selectedSubCategory.toLowerCase().trim();
            const hasMatch = productMatchesSubCategory(product, selectedSubCategory);
            if (normalizedSelectedSub === 'saree') {
              const title = (product.title || product.name || '').toLowerCase();
              const isSareeByTitle = title.includes('saree') || title.includes('sari');
              const isSareeByCategory = product.category === 'saree' || product.category === 'Saree';
              return (
                hasMatch ||
                isSareeByTitle ||
                isSareeByCategory
              );
            }
            return hasMatch;
          });
        }

        // Filter by stock
        if (stockFilter !== 'all') {
          filteredProducts = filteredProducts.filter((p) => {
            const stockValue = Number(p?.stock ?? 0);
            return stockFilter === 'in' ? stockValue > 0 : stockValue <= 0;
          });
        }

        // Sort products
        if (sortBy !== 'default') {
          filteredProducts = [...filteredProducts].sort((a, b) => {
            const stockA = Number(a?.stock ?? 0);
            const stockB = Number(b?.stock ?? 0);
            const priceA = a.finalPrice || a.price || 0;
            const priceB = b.finalPrice || b.price || 0;

            switch (sortBy) {
              case 'price-low':
                return priceA - priceB;
              case 'price-high':
                return priceB - priceA;
              case 'stock-low':
                return stockA - stockB;
              case 'stock-high':
                return stockB - stockA;
              default:
                return 0;
            }
          });
        }

        // Calculate pagination
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        // Reset to page 1 if current page is out of bounds
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
        }

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">View Products</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <select
                  value={productCategory}
                  onChange={(e) => {
                    setProductCategory(e.target.value);
                    setSelectedSubCategory('');
                    setSortBy('default');
                    setStockFilter('all');
                    setCurrentPage(1);
                  }}
                  className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                >
                  {productCategoryOptionsFromNav.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1); // Reset to first page when sort changes
                  }}
                  className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                >
                  <option value="default">Sort by: Default</option>
                  <option value="price-low">Sort by: Price (Low to High)</option>
                  <option value="price-high">Sort by: Price (High to Low)</option>
                  <option value="stock-low">Sort by: Stock (Low to High)</option>
                  <option value="stock-high">Sort by: Stock (High to Low)</option>
                </select>

                <select
                  value={stockFilter}
                  onChange={(e) => {
                    setStockFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                >
                  <option value="all">Stock: All</option>
                  <option value="in">Stock: In Stock</option>
                  <option value="out">Stock: Out of Stock</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by product name, brand, subcategory, price..."
                  value={productSearchQuery}
                  onChange={(e) => { setProductSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {productSearchQuery.trim() && (
                <span className="text-sm text-gray-500">
                  {filteredProductsBySearch.length} of {(products || []).length} products
                </span>
              )}
            </div>
            {/* Subcategory Filter Buttons - from Nav Categories */}
            {viewSubCategoryOptionsFromNav.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-700">Filter by Company:</span>
                  {selectedSubCategory && (
                    <button
                      onClick={() => {
                        setSelectedSubCategory('');
                        setCurrentPage(1);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedSubCategory('');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      selectedSubCategory === ''
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {viewSubCategoryOptionsFromNav.map((subOpt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSubCategory(subOpt.value);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        selectedSubCategory === subOpt.value
                          ? 'bg-amber-500 text-gray-900'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {subOpt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-gray-500">
                {filteredProductsBySearch.length === 0 && (products || []).length > 0
                  ? 'No products match your search.'
                  : selectedSubCategory 
                  ? `No products found in ${selectedSubCategory} subcategory.`
                  : 'No products in this category yet.'}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <p>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subcategory</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sale</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Live on Site</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedProducts.map((product) => {
                          let imageUrl = null;
                          if (Array.isArray(product.images) && product.images.length > 0) {
                            imageUrl = product.images[0];
                          } else if (product.images && typeof product.images === 'object') {
                            imageUrl = product.images.image1 || product.images.image2 || product.images.image3 || product.images.image4;
                          } else if (typeof product.images === 'string' && product.images.trim()) {
                            imageUrl = product.images;
                          }
                          if (!imageUrl) imageUrl = product.thumbnail || product.image;
                          
                          return (
                            <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={product.name || product.title || 'Product'}
                                    className="w-14 h-14 object-cover rounded-lg border"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">No img</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-gray-600">{product.brand}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-gray-900">₹{product.finalPrice || product.price}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  product.stock > 10 ? 'bg-green-100 text-green-700' : 
                                  product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {product.stock}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await adminAPI.updateProduct(product._id, { onSale: !product.onSale });
                                        setProducts(prev => prev.map(p => p._id === product._id ? { ...p, onSale: !p.onSale } : p));
                                      } catch (err) {
                                        console.error('Toggle sale error:', err);
                                      }
                                    }}
                                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${product.onSale ? 'bg-red-500' : 'bg-gray-300'}`}
                                  >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${product.onSale ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center">
                                  <button
                                    title={product.isActive === false ? 'Hidden from website — click to show' : 'Live on website — click to hide'}
                                    onClick={async () => {
                                      const nextActive = product.isActive === false;
                                      try {
                                        const res = await adminAPI.updateProduct(product._id, { isActive: nextActive });
                                        const saved = res?.data?.product?.isActive;
                                        const confirmed = saved === undefined ? nextActive : saved !== false;
                                        setProducts((prev) =>
                                          prev.map((p) =>
                                            p._id === product._id ? { ...p, isActive: confirmed } : p
                                          )
                                        );
                                        if (editingProduct?._id === product._id) {
                                          setProductForm((prev) => ({ ...prev, isActive: confirmed }));
                                          setEditingProduct((prev) => (prev ? { ...prev, isActive: confirmed } : prev));
                                        }
                                      } catch (err) {
                                        console.error('Toggle active error:', err);
                                        setMessage({ type: 'error', text: 'Could not update Live on Site. Try again.' });
                                      }
                                    }}
                                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${product.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                                  >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${product.isActive !== false ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditProduct(product)}
                                    className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product._id)}
                                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-amber-500 text-gray-900'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      case 'add-product':
        return (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Add New Product</h2>
            {productCategoryOptionsFromNav.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                Create categories in <button type="button" onClick={() => setActiveSection('categories')} className="font-semibold underline">Nav Categories</button> first, then they will appear here.
              </p>
            )}
            <form onSubmit={handleCreateProduct} className="bg-white rounded-xl border p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={productForm.category}
                    onChange={handleProductFormChange}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">
                      {productCategoryOptionsFromNav.length ? 'Select Category' : 'No categories — add in Nav Categories'}
                    </option>
                    {productCategoryOptionsFromNav.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory (Select Companies)</label>
                  {productForm.category ? (
                    productSubCategoryOptionsFromNav.length > 0 ? (
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-white">
                        {productSubCategoryOptionsFromNav.map((subOpt, idx) => {
                          const isChecked = hasSubCategoryOption(productForm.subCategory, subOpt.value, subOpt.label);
                          return (
                            <label key={idx} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-0.5 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const val = subOpt.value || slugifySubCategory(subOpt.label);
                                  if (!val) return;
                                  setProductForm((prev) => {
                                    const currentSubs = subCategoryValues(prev.subCategory);
                                    const already = hasSubCategoryOption(currentSubs, val, subOpt.label);
                                    const newSubs = e.target.checked
                                      ? (already ? currentSubs : [...currentSubs, val])
                                      : currentSubs.filter((s) => slugifySubCategory(s) !== slugifySubCategory(val) && slugifySubCategory(s) !== slugifySubCategory(subOpt.label));
                                    return { ...prev, subCategory: newSubs };
                                  });
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="select-none">{subOpt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border">No companies for this category — add them in Nav Categories section.</p>
                    )
                  ) : (
                    <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border">Select a category first to see companies</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    name="name"
                    value={productForm.name}
                    onChange={handleProductFormChange}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add Brand Name</label>
                  {isCustomBrand ? (
                    <div className="flex gap-2">
                      <input
                        name="brand"
                        value={productForm.brand}
                        onChange={handleProductFormChange}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder="Enter new subcategory"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setIsCustomBrand(false); setProductForm((prev) => ({ ...prev, brand: '' })); }}
                        className="px-3 py-2 text-xs font-medium border rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <select
                      name="brand"
                      value={productForm.brand}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setIsCustomBrand(true);
                          setProductForm((prev) => ({ ...prev, brand: '' }));
                        } else {
                          handleProductFormChange(e);
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      disabled={!productForm.category}
                    >
                      <option value="">{productForm.category ? 'Select Subcategory' : 'Select Category First'}</option>
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__add_new__">+ Add New Subcategory</option>
                    </select>
                  )}
                  {productForm.category && availableBrands.length === 0 && !isCustomBrand && (
                    <p className="text-xs text-gray-500 mt-1">No existing subcategories. Select "+ Add New" to create one.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP Price (₹)</label>
                  <input
                    name="originalPrice"
                    type="text" inputMode="numeric"
                    min="0"
                    value={productForm.originalPrice}
                    onChange={handleProductFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    name="discountPercent"
                    type="text" inputMode="numeric"
                    min="0"
                    max="100"
                    value={productForm.discountPercent}
                    onChange={handleProductFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter Discount % to auto-calculate Price, or enter Price to auto-calculate Discount %</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Final Price (₹)</label>
                  <input
                    name="price"
                    type="text" inputMode="numeric"
                    min="0"
                    value={productForm.price}
                    onChange={handleProductFormChange}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    name="stock"
                    type="text" inputMode="numeric"
                    min="0"
                    value={productForm.stock}
                    onChange={handleProductFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {/* Page Position Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">All Page Position No.</label>
                  <input
                    name="pageNumberAll"
                    type="text" inputMode="numeric"
                    min="0"
                    value={productForm.pageNumberAll}
                    onChange={handleProductFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 1, 2, 3..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Product position on the All Products page (lower = first)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Page Position No.</label>
                  <input
                    name="pageNumberCategory"
                    type="text" inputMode="numeric"
                    min="0"
                    value={productForm.pageNumberCategory}
                    onChange={handleProductFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 1, 2, 3..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Product position on its category page (lower = first)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                {/* Upload Area */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => !imageUploading && imageInputRef.current?.click()}
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imageUploading ? (
                    <div className="space-y-2">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-blue-600 font-medium">Uploading... {imageUploadProgress}%</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${imageUploadProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-600">Click to upload images</p>
                      <p className="text-xs text-gray-400">PNG, JPG, WEBP. Max 1.5 MB each. Larger files: compress first. Smaller ones auto-compress before upload.</p>
                    </div>
                  )}
                </div>
                {/* Image Previews */}
                {uploadedImageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                    {uploadedImageUrls.map((url, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border bg-gray-50">
                        <img src={url} alt={`Product ${index + 1}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          ×
                        </button>
                        <p className="text-[10px] text-gray-500 p-1 truncate">{index + 1}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={productForm.description}
                  onChange={handleProductFormChange}
                  rows="3"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Product description"
                />
              </div>

              {/* Color & Box Options Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Color / Variant Options (Optional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color Options (comma separated)</label>
                    <input
                      name="colorOptions"
                      type="text"
                      value={productForm.colorOptions}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Red, Blue, Black, Gold"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter color names separated by commas. Users will choose one when ordering.</p>
                  </div>
                </div>
                
                {/* Color-Specific Image Variants Section */}
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Color-Specific Image Variants (Amazon / Flipkart Style)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Add color name + image URL for each color. When customer selects a color (e.g. Black), the product page main image will automatically switch to that color watch!
                  </p>
                  {(Array.isArray(productForm.colorVariants) && productForm.colorVariants.length > 0
                    ? productForm.colorVariants
                    : [{ color: '', image: '' }]
                  ).map((variant, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        value={variant.color || ''}
                        onChange={(e) => {
                          const updated = [...(productForm.colorVariants || [])];
                          updated[idx] = { ...updated[idx], color: e.target.value };
                          setProductForm((prev) => ({ ...prev, colorVariants: updated }));
                        }}
                        className="w-full sm:w-1/3 border rounded-lg px-3 py-1.5 text-sm"
                        placeholder="Color name (e.g. Black)"
                      />
                      <input
                        type="text"
                        value={variant.image || ''}
                        onChange={(e) => {
                          const updated = [...(productForm.colorVariants || [])];
                          updated[idx] = { ...updated[idx], image: e.target.value };
                          setProductForm((prev) => ({ ...prev, colorVariants: updated }));
                        }}
                        className="flex-1 w-full border rounded-lg px-3 py-1.5 text-sm"
                        placeholder="Image URL for this color (https://ik.imagekit.io/...)"
                      />
                      {variant.image && (
                        <img src={variant.image} alt={variant.color} className="w-8 h-8 object-cover rounded border border-gray-300 flex-shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (productForm.colorVariants || []).filter((_, i) => i !== idx);
                          setProductForm((prev) => ({ ...prev, colorVariants: updated }));
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Remove color variant"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm((prev) => ({
                        ...prev,
                        colorVariants: [...(prev.colorVariants || []), { color: '', image: '' }]
                      }));
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    + Add Color Image Variant
                  </button>
                </div>
                {/* Box Options with Price */}
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Box Options (Name + Price)</label>
                  {(Array.isArray(productForm.boxOptions) ? productForm.boxOptions : [{ name: '', price: '' }]).map((boxOpt, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={boxOpt.name}
                        onChange={(e) => {
                          const updated = [...productForm.boxOptions];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setProductForm((prev) => ({ ...prev, boxOptions: updated }));
                        }}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder="Box name (e.g. Regular Box)"
                      />
                      <input
                        type="text" inputMode="numeric"
                        min="0"
                        value={boxOpt.price}
                        onChange={(e) => {
                          const updated = [...productForm.boxOptions];
                          updated[idx] = { ...updated[idx], price: e.target.value };
                          setProductForm((prev) => ({ ...prev, boxOptions: updated }));
                        }}
                        className="w-28 border rounded-lg px-3 py-2 text-sm"
                        placeholder="Price (₹)"
                      />
                      {(productForm.boxOptions || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (productForm.boxOptions || []).filter((_, i) => i !== idx);
                            setProductForm((prev) => ({ ...prev, boxOptions: updated }));
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setProductForm((prev) => ({ ...prev, boxOptions: [...(prev.boxOptions || []), { name: '', price: '' }] }))}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                  >
                    + Add Box Option
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Enter 0 for free box. Price will be added to product price when user selects this box.</p>
                </div>
              </div>

              {/* Watch Details Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Details (Optional)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                    <input
                      name="model"
                      type="text"
                      value={productForm.model}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. FS5061"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Functions</label>
                    <input
                      name="functions"
                      type="text"
                      value={productForm.functions}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Time, Date, Chrono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dial Color</label>
                    <input
                      name="dialColor"
                      type="text"
                      value={productForm.dialColor}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Black, Blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dial Size</label>
                    <input
                      name="dialSize"
                      type="text"
                      value={productForm.dialSize}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 42mm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Strap Color</label>
                    <input
                      name="strapColor"
                      type="text"
                      value={productForm.strapColor}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Brown, Silver"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Strap Material</label>
                    <input
                      name="strapMaterial"
                      type="text"
                      value={productForm.strapMaterial}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Leather, Steel"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Crystal Material</label>
                    <input
                      name="crystalMaterial"
                      type="text"
                      value={productForm.crystalMaterial}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Mineral, Sapphire"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lock Type</label>
                    <input
                      name="lockType"
                      type="text"
                      value={productForm.lockType}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Clasp, Buckle"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Water Resistance</label>
                    <input
                      name="waterResistance"
                      type="text"
                      value={productForm.waterResistance}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 50m, 100m"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Calendar Type</label>
                    <input
                      name="calendarType"
                      type="text"
                      value={productForm.calendarType}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Date, Day-Date"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Movement</label>
                    <input
                      name="movement"
                      type="text"
                      value={productForm.movement}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Quartz, Automatic"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item Weight</label>
                    <input
                      name="itemWeight"
                      type="text"
                      value={productForm.itemWeight}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 150g"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quality</label>
                    <input
                      name="quality"
                      type="text"
                      value={productForm.quality}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Premium, Standard"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Warranty</label>
                    <input
                      name="warranty"
                      type="text"
                      value={productForm.warranty}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 1 Year, 2 Years"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isNewArrival"
                    checked={productForm.isNewArrival}
                    onChange={handleProductFormChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">New Arrival</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="onSale"
                    checked={productForm.onSale}
                    onChange={handleProductFormChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">On Sale</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={productForm.isFeatured}
                    onChange={handleProductFormChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button
                    type="button"
                    title={productForm.isActive === false ? 'Hidden from website' : 'Live on website'}
                    onClick={() =>
                      setProductForm((prev) => ({ ...prev, isActive: !(prev.isActive !== false) }))
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      productForm.isActive !== false ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        productForm.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-800">Live on Site</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gray-900 text-white font-semibold hover:bg-gray-800 rounded-lg w-full sm:w-auto"
                >
                  Add Product
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 rounded-lg w-full sm:w-auto"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        );

      case 'edit-product':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Product</h2>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
              >
                {productCategoryOptionsFromNav.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {!editingProduct && (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search by product name, brand, subcategory, price..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {productSearchQuery.trim() && (
                  <span className="text-sm text-gray-500">
                    {filteredProductsBySearch.length} of {(products || []).length} products
                  </span>
                )}
              </div>
            )}
            {editingProduct ? (
              <form onSubmit={handleUpdateProduct} className="bg-white rounded-xl border p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={productForm.category}
                      onChange={handleProductFormChange}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select Category</option>
                      {productCategoryOptionsFromNav.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {editingProduct &&
                        productForm.category &&
                        !productCategoryOptionsFromNav.some((o) => o.value === productForm.category) && (
                          <option value={productForm.category}>
                            {productForm.category}
                          </option>
                        )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory (Select Companies)</label>
                    {productForm.category ? (
                      productSubCategoryOptionsFromNav.length > 0 ? (
                        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-white">
                          {productSubCategoryOptionsFromNav.map((subOpt, idx) => {
                            const isChecked = hasSubCategoryOption(productForm.subCategory, subOpt.value, subOpt.label);
                            return (
                              <label key={idx} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-0.5 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const val = subOpt.value || slugifySubCategory(subOpt.label);
                                    if (!val) return;
                                    setProductForm((prev) => {
                                      const currentSubs = subCategoryValues(prev.subCategory);
                                      const already = hasSubCategoryOption(currentSubs, val, subOpt.label);
                                      const newSubs = e.target.checked
                                        ? (already ? currentSubs : [...currentSubs, val])
                                        : currentSubs.filter((s) => slugifySubCategory(s) !== slugifySubCategory(val) && slugifySubCategory(s) !== slugifySubCategory(subOpt.label));
                                      return { ...prev, subCategory: newSubs };
                                    });
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <span className="select-none">{subOpt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border">No companies for this category — add them in Nav Categories section.</p>
                      )
                    ) : (
                      <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border">Select a category first to see companies</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      name="name"
                      value={productForm.name}
                      onChange={handleProductFormChange}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Add Brand Name</label>
                    {isCustomBrand ? (
                      <div className="flex gap-2">
                        <input
                          name="brand"
                          value={productForm.brand}
                          onChange={handleProductFormChange}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          placeholder="Enter new subcategory"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => { setIsCustomBrand(false); setProductForm((prev) => ({ ...prev, brand: '' })); }}
                          className="px-3 py-2 text-xs font-medium border rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        name="brand"
                        value={availableBrands.includes(productForm.brand) ? productForm.brand : (productForm.brand ? '__custom_existing__' : '')}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsCustomBrand(true);
                            setProductForm((prev) => ({ ...prev, brand: '' }));
                          } else if (e.target.value === '__custom_existing__') {
                            // Keep existing custom value
                          } else {
                            handleProductFormChange(e);
                          }
                        }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        disabled={!productForm.category}
                      >
                        <option value="">{productForm.category ? 'Select Subcategory' : 'Select Category First'}</option>
                        {productForm.brand && !availableBrands.includes(productForm.brand) && (
                          <option value="__custom_existing__">{productForm.brand} (current)</option>
                        )}
                        {availableBrands.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        <option value="__add_new__">+ Add New Subcategory</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MRP Price (₹)</label>
                    <input
                      name="originalPrice"
                      type="text" inputMode="numeric"
                      min="0"
                      value={productForm.originalPrice}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                    <input
                      name="discountPercent"
                      type="text" inputMode="numeric"
                      min="0"
                      max="100"
                      value={productForm.discountPercent}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter Discount % to auto-calculate Price, or enter Price to auto-calculate Discount %</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Price (₹)</label>
                    <input
                      name="price"
                      type="text" inputMode="numeric"
                      min="0"
                      value={productForm.price}
                      onChange={handleProductFormChange}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input
                      name="stock"
                      type="text" inputMode="numeric"
                      min="0"
                      value={productForm.stock}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                {/* Page Position Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">All Page Position No.</label>
                    <input
                      name="pageNumberAll"
                      type="text" inputMode="numeric"
                      min="0"
                      value={productForm.pageNumberAll}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 1, 2, 3..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Product position on the All Products page (lower = first)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Page Position No.</label>
                    <input
                      name="pageNumberCategory"
                      type="text" inputMode="numeric"
                      min="0"
                      value={productForm.pageNumberCategory}
                      onChange={handleProductFormChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 1, 2, 3..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Product position on its category page (lower = first)</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                  {/* Upload Area */}
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => !imageUploading && imageInputRef.current?.click()}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {imageUploading ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-blue-600 font-medium">Uploading... {imageUploadProgress}%</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${imageUploadProgress}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600">Click to upload images</p>
                        <p className="text-xs text-gray-400">PNG, JPG, WEBP. Max 1.5 MB each. Larger files: compress first. Smaller ones auto-compress before upload.</p>
                      </div>
                    )}
                  </div>
                  {/* Image Previews */}
                  {uploadedImageUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                      {uploadedImageUrls.map((url, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border bg-gray-50">
                          <img src={url} alt={`Product ${index + 1}`} className="w-full h-24 object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          >
                            ×
                          </button>
                          <p className="text-[10px] text-gray-500 p-1 truncate">{index + 1}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={productForm.description}
                    onChange={handleProductFormChange}
                    rows="3"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Color & Box Options Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Color / Variant Options (Optional)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Color Options (comma separated)</label>
                      <input
                        name="colorOptions"
                        type="text"
                        value={productForm.colorOptions}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Red, Blue, Black, Gold"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter color names separated by commas. Users will choose one when ordering.</p>
                    </div>
                  </div>
                  {/* Box Options with Price */}
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Box Options (Name + Price)</label>
                    {(Array.isArray(productForm.boxOptions) ? productForm.boxOptions : [{ name: '', price: '' }]).map((boxOpt, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={boxOpt.name}
                          onChange={(e) => {
                            const updated = [...productForm.boxOptions];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setProductForm((prev) => ({ ...prev, boxOptions: updated }));
                          }}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          placeholder="Box name (e.g. Regular Box)"
                        />
                        <input
                          type="text" inputMode="numeric"
                          min="0"
                          value={boxOpt.price}
                          onChange={(e) => {
                            const updated = [...productForm.boxOptions];
                            updated[idx] = { ...updated[idx], price: e.target.value };
                            setProductForm((prev) => ({ ...prev, boxOptions: updated }));
                          }}
                          className="w-28 border rounded-lg px-3 py-2 text-sm"
                          placeholder="Price (₹)"
                        />
                        {(productForm.boxOptions || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (productForm.boxOptions || []).filter((_, i) => i !== idx);
                              setProductForm((prev) => ({ ...prev, boxOptions: updated }));
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setProductForm((prev) => ({ ...prev, boxOptions: [...(prev.boxOptions || []), { name: '', price: '' }] }))}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                    >
                      + Add Box Option
                    </button>
                    <p className="text-xs text-gray-500 mt-1">Enter 0 for free box. Price will be added to product price when user selects this box.</p>
                  </div>
                </div>

                {/* Watch Details Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Watch Details (Optional)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                      <input
                        name="model"
                        type="text"
                        value={productForm.model}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. FS5061"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Functions</label>
                      <input
                        name="functions"
                        type="text"
                        value={productForm.functions}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Time, Date, Chrono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dial Color</label>
                      <input
                        name="dialColor"
                        type="text"
                        value={productForm.dialColor}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Black, Blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dial Size</label>
                      <input
                        name="dialSize"
                        type="text"
                        value={productForm.dialSize}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 42mm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Strap Color</label>
                      <input
                        name="strapColor"
                        type="text"
                        value={productForm.strapColor}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Brown, Silver"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Strap Material</label>
                      <input
                        name="strapMaterial"
                        type="text"
                        value={productForm.strapMaterial}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Leather, Steel"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Crystal Material</label>
                      <input
                        name="crystalMaterial"
                        type="text"
                        value={productForm.crystalMaterial}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Mineral, Sapphire"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lock Type</label>
                      <input
                        name="lockType"
                        type="text"
                        value={productForm.lockType}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Clasp, Buckle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Water Resistance</label>
                      <input
                        name="waterResistance"
                        type="text"
                        value={productForm.waterResistance}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 50m, 100m"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Calendar Type</label>
                      <input
                        name="calendarType"
                        type="text"
                        value={productForm.calendarType}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Date, Day-Date"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Movement</label>
                      <input
                        name="movement"
                        type="text"
                        value={productForm.movement}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Quartz, Automatic"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Item Weight</label>
                      <input
                        name="itemWeight"
                        type="text"
                        value={productForm.itemWeight}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 150g"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quality</label>
                      <input
                        name="quality"
                        type="text"
                        value={productForm.quality}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Premium, Standard"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Warranty</label>
                      <input
                        name="warranty"
                        type="text"
                        value={productForm.warranty}
                        onChange={handleProductFormChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 1 Year, 2 Years"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isNewArrival"
                      checked={productForm.isNewArrival}
                      onChange={handleProductFormChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">New Arrival</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="onSale"
                      checked={productForm.onSale}
                      onChange={handleProductFormChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">On Sale</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={productForm.isFeatured}
                      onChange={handleProductFormChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Featured</span>
                  </label>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      type="button"
                      title={productForm.isActive === false ? 'Hidden from website' : 'Live on website'}
                      onClick={() =>
                        setProductForm((prev) => ({ ...prev, isActive: !(prev.isActive !== false) }))
                      }
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                        productForm.isActive !== false ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          productForm.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-sm font-medium text-gray-800">Live on Site</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gray-900 text-white font-semibold hover:bg-gray-800 rounded-lg w-full sm:w-auto"
                  >
                    Update Product
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveSection('products');
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 rounded-lg w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
) : (
                  <>
                {loading ? (
                  <p className="text-sm text-gray-500">Loading products...</p>
                ) : (products || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No products in this category yet.</p>
                ) : filteredProductsBySearch.length === 0 ? (
                  <p className="text-sm text-gray-500">No products match your search.</p>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredProductsBySearch.map((product) => {
                            let imageUrl = null;
                            if (Array.isArray(product.images) && product.images.length > 0) {
                              imageUrl = product.images[0];
                            } else if (product.images && typeof product.images === 'object') {
                              imageUrl = product.images.image1 || product.images.image2 || product.images.image3 || product.images.image4;
                            } else if (typeof product.images === 'string' && product.images.trim()) {
                              imageUrl = product.images;
                            }
                            if (!imageUrl) imageUrl = product.thumbnail || product.image;
                            
                            return (
                              <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={product.name || product.title || 'Product'}
                                      className="w-14 h-14 object-cover rounded-lg border"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">No img</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm text-gray-600">{product.brand}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-gray-900">₹{product.finalPrice || product.price}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    product.stock > 10 ? 'bg-green-100 text-green-700' : 
                                    product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {product.stock}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() => handleEditProduct(product)}
                                      className="px-4 py-1.5 text-xs font-medium bg-amber-500 text-gray-900 hover:bg-amber-600 rounded transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'delete-product':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Delete Products</h2>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
              >
                {productCategoryOptionsFromNav.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Loading products...</p>
            ) : (products || []).length === 0 ? (
              <p className="text-sm text-gray-500">No products in this category yet.</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subcategory</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product) => {
                        let imageUrl = null;
                        if (Array.isArray(product.images) && product.images.length > 0) {
                          imageUrl = product.images[0];
                        } else if (product.images && typeof product.images === 'object') {
                          imageUrl = product.images.image1 || product.images.image2 || product.images.image3 || product.images.image4;
                        } else if (typeof product.images === 'string' && product.images.trim()) {
                          imageUrl = product.images;
                        }
                        if (!imageUrl) imageUrl = product.thumbnail || product.image;
                        
                        return (
                          <tr key={product._id} className="hover:bg-red-50 transition-colors">
                            <td className="px-4 py-3">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={product.name || product.title || 'Product'}
                                  className="w-14 h-14 object-cover rounded-lg border"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No img</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-600">{product.brand}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">₹{product.finalPrice || product.price}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                product.stock > 10 ? 'bg-green-100 text-green-700' : 
                                product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-red-100 text-red-700'
                              }`}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={() => handleDeleteProduct(product._id)}
                                  className="px-4 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case 'home-reels':
        return (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Home Page Reels</h2>
            <p className="text-sm text-gray-600">Add Instagram Reels to display on the home page.</p>

            {/* Add/Edit Reel Form */}
            <form
              id="admin-reel-form"
              onSubmit={editingReel ? handleUpdateReel : handleCreateReel}
              className="bg-white rounded-xl border p-6 space-y-4 scroll-mt-20"
            >
              <h3 className="font-semibold text-gray-900">{editingReel ? 'Edit Reel' : 'Add New Reel'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={reelForm.title}
                    onChange={handleReelFormChange}
                    required
                    placeholder="e.g. New Collection Showcase"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Video *</label>
                  
                  {/* Upload Button */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <input
                      type="file"
                      ref={videoInputRef}
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors ${videoUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {videoUploading ? 'Uploading...' : 'Upload Video'}
                      </span>
                    </label>
                    <span className="text-xs text-gray-500 self-center">or paste URL below</span>
                  </div>

                  {/* Upload Progress */}
                  {videoUploading && (
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
                    </div>
                  )}

                  {/* URL Input */}
                  <input
                    type="text"
                    name="videoUrl"
                    value={reelForm.videoUrl}
                    onChange={handleReelFormChange}
                    required
                    placeholder="https://res.cloudinary.com/.../video.mp4"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  
                  {/* Video Preview */}
                  {reelForm.videoUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Preview:</p>
                      <video 
                        src={reelForm.videoUrl} 
                        className="w-32 h-48 object-cover rounded-lg border"
                        controls
                        muted
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (optional)</label>
                  <input
                    type="url"
                    name="thumbnailUrl"
                    value={reelForm.thumbnailUrl}
                    onChange={handleReelFormChange}
                    placeholder="https://example.com/thumbnail.jpg"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Link (optional)</label>
                  <input
                    type="url"
                    name="productLink"
                    value={reelForm.productLink}
                    onChange={handleReelFormChange}
                    placeholder="e.g. /product/watch-123 or full URL"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Add product link to show "Buy Now" button below reel</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="text" inputMode="numeric"
                    name="order"
                    value={reelForm.order}
                    onChange={handleReelFormChange}
                    min="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={reelForm.isActive}
                    onChange={handleReelFormChange}
                    className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (show on home page)</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-amber-500 text-gray-900 font-semibold hover:bg-amber-600 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingReel ? 'Update Reel' : 'Add Reel'}
                </button>
                {editingReel && (
                  <button
                    type="button"
                    onClick={resetReelForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 rounded-lg"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Reels List */}
            {loading && !(reels || []).length ? (
              <p className="text-sm text-gray-500">Loading reels...</p>
            ) : (reels || []).length === 0 ? (
              <p className="text-sm text-gray-500">No reels added yet.</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Preview</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reels.map((reel) => {
                        const rid = reel._id;
                        return (
                        <tr key={rid} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{reel.order}</span>
                          </td>
                          <td className="px-4 py-3">
                            <video 
                              src={reel.videoUrl}
                              className="w-16 h-24 object-cover rounded-lg"
                              muted
                              playsInline
                              onMouseEnter={(e) => e.target.play()}
                              onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-sm">{reel.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleReelStatus(rid)}
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                reel.isActive 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {reel.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditReel(reel)}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReel(rid)}
                                className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case 'categories':
        return (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Nav Categories</h2>
            <p className="text-sm text-gray-600">These categories appear in the site navigation. Add, edit, or remove them here.</p>

            {/* Add / Edit form */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category name</label>
                    <input
                      name="name"
                      value={categoryForm.name}
                      onChange={handleCategoryFormChange}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Men's Watches"
                    />
                    <p className="text-xs text-gray-500 mt-0.5">URL slug is generated automatically from the name.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position No.</label>
                    <input
                      type="number"
                      name="order"
                      value={categoryForm.order}
                      onChange={handleCategoryFormChange}
                      min={0}
                      step={1}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="0, 1, 2..."
                    />
                    <p className="text-xs text-gray-500 mt-0.5">Lower number appears first in navigation.</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Company Names</label>
                    <button type="button" onClick={handleAddSubItemRow} className="text-sm text-blue-600 hover:underline">+ Add company</button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Add one or more company names. They will appear as dropdown links under this category.</p>
                  <div className="space-y-2">
                    {subItemInputs.map((sub, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 items-center">
                        <input
                          value={sub.name || ''}
                          onChange={(e) => handleSubItemChange(idx, 'name', e.target.value)}
                          className="border rounded px-2 py-1.5 text-sm w-48"
                          placeholder="e.g. Fossil, Titan, Casio"
                        />
                        <button type="button" onClick={() => handleRemoveSubItem(idx)} className="text-red-600 text-sm">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800">
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </button>
                  {editingCategory && (
                    <button type="button" onClick={resetCategoryForm} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current categories</h3>
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (navCategories || []).length === 0 ? (
                <p className="text-sm text-gray-500">No categories yet. Add one above.</p>
              ) : (
                <ul className="space-y-3">
                  {navCategories.map((cat) => (
                    <li key={cat._id} className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">#{cat.order ?? 0} - {cat.name}</p>
                        <p className="text-xs text-gray-500">{cat.path}</p>
                        {cat.subItems?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">Companies: {cat.subItems.map((s) => s.name).join(', ')}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCategory(cat)}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat._id)}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Orders</h2>
              <button
                onClick={fetchOrders}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 rounded-lg w-full sm:w-auto"
              >
                Refresh
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by Order ID, customer, email, status, total..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {orderSearchQuery.trim() && (
                <span className="text-sm text-gray-500">
                  {filteredOrdersForSearch.length} of {(orders || []).length} orders
                </span>
              )}
            </div>
            {(orders || []).length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-sm">No orders yet</p>
              </div>
            ) : filteredOrdersForSearch.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-sm">No orders match your search</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pay</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrdersForSearch.map((order) => (
                        <tr
                          key={order._id}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                          onClick={() => setSelectedOrderDetail(order)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                            #{order._id?.slice(-8)?.toUpperCase() || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(order.orderDate || order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate" title={order.user?.name}>
                            {order.user?.name || 'Guest'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={order.user?.email}>
                            {order.user?.email || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                order.status === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : order.status === 'shipped'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : order.status === 'processing'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : order.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                            {String(order.paymentMethod || 'COD').toLowerCase() === 'cod' ? (
                              <span title="Cash on Delivery">COD</span>
                            ) : (
                              <span title="Paid online">Online</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                            ₹{order.totalAmount?.toLocaleString() || '0'}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedOrderDetail(order); }}
                              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Order detail modal - opens when row or View is clicked */}
            {selectedOrderDetail && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedOrderDetail(null)}>
                <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const order = selectedOrderDetail;
                    const payMethod = String(order.paymentMethod || 'COD').toLowerCase();
                    const isCod = payMethod === 'cod';
                    const isOnline = payMethod === 'razorpay' || payMethod === 'online';
                    const adv = order.advancePayment;
                    const advAmount = Number(adv?.amount) || 0;
                    const advPaid = adv?.status === 'paid' && advAmount > 0;
                    const orderTotal = Number(order.totalAmount) || 0;
                    const codDueOnDelivery =
                      isCod && orderTotal > 0 ? Math.max(0, orderTotal - (advPaid ? advAmount : 0)) : null;
                    const lineSubtotal = (order.items || []).reduce(
                      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
                      0
                    );
                    const couponDisc = Number(order.coupon?.discount) || 0;
                    const afterCoupon = Math.max(0, lineSubtotal - couponDisc);
                    const computedShipping = Math.max(0, orderTotal - afterCoupon);
                    const threshold = Number(shippingConfig.freeShippingThreshold) || 2000;
                    const shippingLineLabel =
                      computedShipping === 0
                        ? afterCoupon >= threshold
                          ? `Free (subtotal after coupon ≥ ₹${threshold.toLocaleString()})`
                          : '₹0 (free or waived at checkout)'
                        : '';
                    const totalsMatch = Math.round(afterCoupon + computedShipping) === Math.round(orderTotal);
                    return (
                      <>
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
                          <h3 className="text-lg font-bold text-gray-900">Order #{order._id?.slice(-8)?.toUpperCase() || 'N/A'}</h3>
                          <button type="button" onClick={() => setSelectedOrderDetail(null)} className="text-gray-400 hover:text-gray-600 p-1">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-semibold uppercase rounded-full ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                            </span>
                            {order.status === 'cancelled' && order.cancelReason && (
                              <p className="text-xs text-red-700" title={order.cancelReason}>Reason: {order.cancelReason}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-600">Customer:</span> <span className="font-medium text-gray-900">{order.user?.name || 'Guest'}</span></div>
                            <div><span className="text-gray-600">Email:</span> <span className="text-gray-900">{order.user?.email || 'N/A'}</span></div>
                            <div><span className="text-gray-600">Date:</span> <span className="text-gray-900">{new Date(order.orderDate || order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                            <div><span className="text-gray-600">Items:</span> <span className="font-medium text-gray-900">{order.items?.length || 0} item(s)</span></div>
                          </div>

                          {/* Shipping Address */}
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Shipping Address</h4>
                            {order.shippingAddress ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-gray-600">Name:</span>
                                    <span className="font-medium text-gray-900 ml-2">{order.shippingAddress.name || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Phone:</span>
                                    <span className="text-gray-900 ml-2">{order.shippingAddress.phone || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <span className="text-gray-600">Address:</span>
                                  <div className="text-gray-900 mt-1">
                                    <p>{order.shippingAddress.address || 'N/A'}</p>
                                    {(order.shippingAddress.city || order.shippingAddress.state || order.shippingAddress.zipCode) && (
                                      <p className="mt-1">
                                        {order.shippingAddress.city && `${order.shippingAddress.city}, `}
                                        {order.shippingAddress.state && `${order.shippingAddress.state} `}
                                        {order.shippingAddress.zipCode && `- ${order.shippingAddress.zipCode}`}
                                      </p>
                                    )}
                                    <p>{order.shippingAddress.country || 'India'}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                                <p className="text-yellow-800">No shipping address available</p>
                              </div>
                            )}
                          </div>

                          {/* Payment — how paid, advance, balance */}
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Payment</h4>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2">
                              <div className="flex justify-between gap-2">
                                <span className="text-gray-600">Method</span>
                                <span className="font-medium text-gray-900 text-right">
                                  {isCod ? 'Cash on Delivery' : isOnline ? 'Online (Razorpay)' : order.paymentMethod || '—'}
                                </span>
                              </div>
                              {isCod && (
                                <>
                                  {advPaid ? (
                                    <div className="flex justify-between gap-2 text-green-700">
                                      <span>Advance paid online</span>
                                      <span className="font-semibold">₹{advAmount.toLocaleString()}</span>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                                      No online advance recorded (older order or pending capture).
                                    </p>
                                  )}
                                  <div className="flex justify-between gap-2 pt-1 border-t border-slate-200">
                                    <span className="text-gray-600">Due on delivery (COD)</span>
                                    <span className="font-semibold text-gray-900">
                                      ₹{codDueOnDelivery != null ? codDueOnDelivery.toLocaleString() : '—'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2 text-xs text-gray-500">
                                    <span>Order total</span>
                                    <span>₹{orderTotal.toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                              {isOnline && (
                                <>
                                  <div className="flex justify-between gap-2">
                                    <span className="text-gray-600">Payment status</span>
                                    <span
                                      className={`font-medium ${
                                        order.paymentStatus === 'paid' ? 'text-green-700' : 'text-amber-700'
                                      }`}
                                    >
                                      {order.paymentStatus === 'paid'
                                        ? 'Paid in full online'
                                        : order.paymentStatus || '—'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span className="text-gray-600">Amount collected</span>
                                    <span className="font-semibold text-gray-900">₹{orderTotal.toLocaleString()}</span>
                                  </div>
                                  {order.paymentId && (
                                    <p className="text-xs text-gray-500 font-mono break-all pt-1">
                                      Razorpay payment: {order.paymentId}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">ParcelGuru</h4>
                            <p className="text-xs text-gray-500 mb-3">
                              Webhook: <code className="bg-gray-100 px-1 rounded text-[11px]">POST …/api/v1/channel/event/hook</code> with header{' '}
                              <code className="bg-gray-100 px-1 rounded text-[11px]">x-access-token</code> (use{' '}
                              <code className="bg-gray-100 px-1 rounded text-[11px]">PARCELGURU_API_KEY</code> or{' '}
                              <code className="bg-gray-100 px-1 rounded text-[11px]">PARCELGURU_WEBHOOK_TOKEN</code>).
                            </p>
                            {(order.parcelGuru?.awbNumber || order.parcelGuru?.shipmentStatus) && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mb-3 space-y-1">
                                {order.parcelGuru?.awbNumber ? (
                                  <div>
                                    <span className="text-gray-600">AWB: </span>
                                    <span className="font-mono font-medium text-gray-900">{order.parcelGuru.awbNumber}</span>
                                  </div>
                                ) : null}
                                {order.parcelGuru?.shipmentStatus ? (
                                  <div>
                                    <span className="text-gray-600">Shipment status: </span>
                                    <span className="font-medium text-gray-900">{order.parcelGuru.shipmentStatus}</span>
                                  </div>
                                ) : null}
                                {order.parcelGuru?.lastMessage ? (
                                  <p className="text-xs text-gray-600">{order.parcelGuru.lastMessage}</p>
                                ) : null}
                              </div>
                            )}
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Order ID sent to ParcelGuru (must match webhook <code className="font-mono text-[11px]">order_id</code>)
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={parcelGuruRefDraft}
                                onChange={(e) => setParcelGuruRefDraft(e.target.value)}
                                className="flex-1 text-sm border border-gray-300 px-3 py-2 rounded-lg font-mono"
                                placeholder="MongoDB _id or custom reference"
                              />
                              <button
                                type="button"
                                disabled={parcelGuruRefSaving}
                                onClick={handleSaveParcelGuruReference}
                                className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                              >
                                {parcelGuruRefSaving ? 'Saving…' : 'Save reference'}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 break-all">
                              Shop order ID: <span className="font-mono">{String(order._id)}</span>. Enter the same value as ParcelGuru shipment <span className="font-mono">order_id</span> (or save a custom reference above).
                            </p>
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Order summary (how total is built)</h4>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                              <div className="flex justify-between gap-2">
                                <span className="text-gray-600">Subtotal (items)</span>
                                <span className="font-medium text-gray-900">₹{lineSubtotal.toLocaleString()}</span>
                              </div>
                              {couponDisc > 0 && (
                                <div className="flex justify-between gap-2 text-green-700">
                                  <span>Coupon discount{order.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
                                  <span className="font-medium">−₹{couponDisc.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-2">
                                <span className="text-gray-600">After discount</span>
                                <span className="font-medium text-gray-900">₹{afterCoupon.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-gray-600">Shipping</span>
                                <span className={`font-medium text-right ${computedShipping === 0 ? 'text-green-700' : 'text-gray-900'}`}>
                                  {computedShipping === 0 ? shippingLineLabel : `₹${computedShipping.toLocaleString()}`}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2 pt-2 border-t border-gray-300 text-base font-bold">
                                <span className="text-gray-900">Order total</span>
                                <span className="text-gray-900">₹{orderTotal.toLocaleString()}</span>
                              </div>
                              {!totalsMatch && (
                                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                                  Subtotal + shipping does not match stored total — item prices may have changed after this order was placed.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200">
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <select
                                value={order.status || 'pending'}
                                onChange={(e) => handleOrderStatusChange(order._id, e.target.value)}
                                className="text-sm border border-gray-300 px-3 py-2 rounded-lg bg-white"
                              >
                                {statusOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                              </select>
                              <button
                                onClick={() => { handleDeleteOrder(order._id); setSelectedOrderDetail(null); }}
                                className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 rounded-lg"
                              >
                                Delete Order
                              </button>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Order Items</h4>
                            <div className="space-y-3">
                              {order.items?.map((item, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                  {item.product?.images?.[0] ? (
                                    <img src={item.product.images[0]} alt={item.product.name} className="w-20 h-20 object-cover border border-gray-200 rounded flex-shrink-0" />
                                  ) : (
                                    <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded flex-shrink-0 flex items-center justify-center"><span className="text-xs text-gray-400">No Image</span></div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-semibold text-gray-900 text-sm mb-1">{item.product?.name || 'Product'}</h5>
                                    {item.product?.brand && <p className="text-xs text-gray-600">Brand: {item.product.brand}</p>}
                                    <div className="flex flex-wrap gap-3 text-xs mt-2">
                                      <span>Qty: {item.quantity}</span>
                                      <span>₹{item.price?.toLocaleString() || '0'} each</span>
                                      <span>Size: {item.size || item.selectedSize || 'N/A'}</span>
                                      {(item.color || item.selectedColor) && (
                                        <span className="inline-flex items-center gap-1 font-bold text-xs bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-md shadow-sm">
                                          🎨 Color: {item.color || item.selectedColor}
                                        </span>
                                      )}
                                      {item.boxType && <span>Box: {item.boxType}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-500">Subtotal</p>
                                    <p className="font-bold text-gray-900">₹{((item.price || 0) * (item.quantity || 0)).toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );

      case 'return-orders':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Return Order Management</h2>
              <button
                type="button"
                onClick={fetchReturnRequests}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 rounded-lg"
              >
                Refresh
              </button>
            </div>
            {(returnRequests || []).length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-sm">No return requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Photos / Video</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {returnRequests.map((req) => {
                      const orderId = req.order?._id ?? req.order ?? '—';
                      const orderLabel = typeof orderId === 'string' ? `#${orderId.slice(-6).toUpperCase()}` : '—';
                      const userName = req.user?.name || req.user?.email || '—';
                      const isUpdating = returnUpdatingId === req._id;
                      return (
                        <tr key={req._id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{orderLabel}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{userName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={req.reason}>{req.reason || '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap gap-2">
                              {(req.photoUrls || []).map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Photo {i + 1}</a>
                              ))}
                              {req.videoUrl && (
                                <a href={req.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Video</a>
                              )}
                              {!(req.photoUrls?.length) && !req.videoUrl && '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              req.status === 'approved' ? 'bg-green-100 text-green-800' :
                              req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              req.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {(req.status || 'pending').toLowerCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                placeholder="Notes / Reject reason (user will see if rejected)"
                                value={returnAdminNotes[req._id] ?? req.adminNotes ?? ''}
                                onChange={(e) => setReturnAdminNotes((prev) => ({ ...prev, [req._id]: e.target.value }))}
                                className="px-2 py-1 text-xs border border-gray-300 rounded w-48"
                              />
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReturnStatus(req._id, 'approved', returnAdminNotes[req._id] ?? req.adminNotes)}
                                  disabled={isUpdating || req.status === 'approved'}
                                  className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReturnStatus(req._id, 'rejected', returnAdminNotes[req._id] ?? req.adminNotes)}
                                  disabled={isUpdating || req.status === 'rejected'}
                                  className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReturnStatus(req._id, 'completed', returnAdminNotes[req._id] ?? req.adminNotes)}
                                  disabled={isUpdating || req.status === 'completed' || req.status !== 'approved'}
                                  className="px-2 py-1 text-xs font-medium bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                                  title="Mark return as completed (e.g. refund done)"
                                >
                                  Mark completed
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'reviews': {
        const q = (reviewSearchQuery || '').trim().toLowerCase();
        const filteredReviews = (reviews || [])
          .filter((review) => {
            if (!q) return true;
            const title = (review.title || '').toLowerCase();
            const comment = (review.comment || '').toLowerCase();
            const userName = (review.userName || '').toLowerCase();
            const userEmail = (review.userEmail || '').toLowerCase();
            const productId = String(review.productId || '').toLowerCase();
            return (
              title.includes(q) ||
              comment.includes(q) ||
              userName.includes(q) ||
              userEmail.includes(q) ||
              productId.includes(q)
            );
          })
          .filter((review) => (
            reviewRatingFilter === 'all'
              ? true
              : Number(review.rating || 0) === Number(reviewRatingFilter)
          ))
          .sort((a, b) => {
            if (reviewSortBy === 'oldest') {
              return new Date(a.createdAt) - new Date(b.createdAt);
            }
            if (reviewSortBy === 'highest') {
              return Number(b.rating || 0) - Number(a.rating || 0);
            }
            if (reviewSortBy === 'lowest') {
              return Number(a.rating || 0) - Number(b.rating || 0);
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
          });

        const hasReviewFilters =
          q ||
          reviewRatingFilter !== 'all' ||
          reviewSortBy !== 'newest';

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Review Management</h2>
              <button
                type="button"
                onClick={fetchAdminReviews}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 rounded-lg"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                  <input
                    type="text"
                    value={reviewSearchQuery}
                    onChange={(e) => setReviewSearchQuery(e.target.value)}
                    placeholder="Search by user, title, comment, product ID..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {hasReviewFilters && (
                  <span className="text-sm text-gray-500">
                    {filteredReviews.length} of {(reviews || []).length} reviews
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Rating: All</option>
                  <option value="5">Rating: 5★</option>
                  <option value="4">Rating: 4★</option>
                  <option value="3">Rating: 3★</option>
                  <option value="2">Rating: 2★</option>
                  <option value="1">Rating: 1★</option>
                </select>
                <select
                  value={reviewSortBy}
                  onChange={(e) => setReviewSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="newest">Sort by: Newest</option>
                  <option value="oldest">Sort by: Oldest</option>
                  <option value="highest">Sort by: Highest Rating</option>
                  <option value="lowest">Sort by: Lowest Rating</option>
                </select>
              </div>
            </div>

            {loadingReviews ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-sm">Loading reviews...</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-sm">No reviews found</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rating</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Review</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReviews.map((review) => (
                      <tr key={review._id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium text-gray-900">{review.userName || 'Anonymous'}</div>
                          <div className="text-xs text-gray-500">{review.userEmail || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{review.productId || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{review.rating || 0}/5</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                          <div className="font-medium text-gray-900">{review.title || 'No title'}</div>
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">{review.comment || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review._id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700"
                          >
                            Delete Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Users</h2>
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 w-full sm:w-auto"
              >
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="bg-white border p-12 text-center">
                <p className="text-gray-500 text-sm">Loading users...</p>
              </div>
            ) : (users || []).length === 0 ? (
              <div className="bg-white border p-12 text-center">
                <p className="text-gray-500 text-sm">No users found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {users.map((user) => (
                  <div key={user._id} className="bg-white border border-gray-200">
                    <div className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1 w-full space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                              {user.name || 'No Name'}
                            </h3>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-gray-600">Email:</span>
                              <span className="ml-2 text-gray-900">{user.email || 'N/A'}</span>
                            </div>
                            {user.phone && (
                              <div>
                                <span className="text-gray-600">Phone:</span>
                                <span className="ml-2 text-gray-900">{user.phone}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600">User ID:</span>
                              <span className="ml-2 text-gray-900 font-mono text-xs">
                                {user._id?.slice(-8)?.toUpperCase() || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Joined:</span>
                              <span className="ml-2 text-gray-900">
                                {new Date(user.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 whitespace-nowrap w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={user.isAdmin}
                          >
                            Delete User
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'coupons':
        return (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Coupon Management</h2>

            {/* Scratch & Win popup — Active / Inactive */}
            <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Scratch & Win popup</h3>
                  <p className="text-sm text-gray-600 mt-1">Show the &quot;Scratch and Win&quot; popup when users open the website. Turn off to stop showing it.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleScratchCardPopup}
                  disabled={scratchCardPopupUpdating}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0 disabled:opacity-50 ${
                    scratchCardPopupActive
                      ? 'bg-amber-500 text-gray-900 hover:bg-amber-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {scratchCardPopupUpdating ? (
                    <span className="animate-pulse">Updating...</span>
                  ) : scratchCardPopupActive ? (
                    <>Active</>
                  ) : (
                    <>Inactive</>
                  )}
                </button>
              </div>
            </div>

            {/* Create / Edit Coupon Form */}
            <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                {/* User Type Selection - Top */}
                <div className="flex flex-wrap items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coupon For:</span>
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${
                    !couponForm.forNewUsers && !couponForm.forExistingUsers
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="userType"
                      checked={!couponForm.forNewUsers && !couponForm.forExistingUsers}
                      onChange={() => setCouponForm({ ...couponForm, forNewUsers: false, forExistingUsers: false })}
                      className="sr-only"
                    />
                    All Users
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${
                    couponForm.forNewUsers
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="userType"
                      checked={couponForm.forNewUsers}
                      onChange={() => setCouponForm({ ...couponForm, forNewUsers: true, forExistingUsers: false })}
                      className="sr-only"
                    />
                    New Users Only
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${
                    couponForm.forExistingUsers
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="userType"
                      checked={couponForm.forExistingUsers}
                      onChange={() => setCouponForm({ ...couponForm, forExistingUsers: true, forNewUsers: false })}
                      className="sr-only"
                    />
                    Old Users Only
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Code */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Coupon Code *</label>
                    <input
                      type="text"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SAVE20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent uppercase"
                      required
                    />
                  </div>

                  {/* Discount Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Discount Type *</label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Discount Value * {couponForm.discountType === 'percentage' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="text" inputMode="numeric"
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                      placeholder={couponForm.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 200'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      min="0"
                      required
                    />
                  </div>

                  {/* Min Order Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Min Order Amount (₹)</label>
                    <input
                      type="text" inputMode="numeric"
                      value={couponForm.minOrderAmount}
                      onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      min="0"
                    />
                  </div>

                  {/* Max Discount (for percentage type) */}
                  {couponForm.discountType === 'percentage' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Max Discount Cap (₹)</label>
                      <input
                        type="text" inputMode="numeric"
                        value={couponForm.maxDiscount}
                        onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                        placeholder="e.g. 500 (leave empty for no cap)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}

                  {/* Usage Limit */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Usage Limit</label>
                    <input
                      type="text" inputMode="numeric"
                      value={couponForm.usageLimit}
                      onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                      placeholder="Leave empty for unlimited"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      min="0"
                    />
                  </div>

                  {/* Per User Limit */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Per User Limit</label>
                    <input
                      type="text" inputMode="numeric"
                      value={couponForm.perUserLimit}
                      onChange={(e) => setCouponForm({ ...couponForm, perUserLimit: e.target.value })}
                      placeholder="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      min="1"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={couponForm.expiryDate}
                      onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponForm.isActive}
                        onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    placeholder="e.g. Get 20% off on orders above ₹500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </button>
                  {editingCoupon && (
                    <button
                      type="button"
                      onClick={resetCouponForm}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Coupons List */}
            <div className="bg-white rounded-2xl border border-brown-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Coupons ({(coupons || []).length})</h3>
                <button onClick={fetchCoupons} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                  Refresh
                </button>
              </div>

              {loadingCoupons ? (
                <div className="p-8 text-center text-gray-500">Loading coupons...</div>
              ) : (coupons || []).length === 0 ? (
                <div className="p-8 text-center text-gray-500">No coupons created yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Discount</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Min Order</th>
                        <th className="px-4 py-3 hidden md:table-cell">Usage</th>
                        <th className="px-4 py-3 hidden lg:table-cell">Expiry</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coupons.map((coupon) => {
                        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                        return (
                          <tr key={coupon._id} className={`hover:bg-gray-50 ${isExpired ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {coupon.code}
                              </span>
                              {coupon.forNewUsers && (
                                <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">NEW USERS</span>
                              )}
                              {coupon.forExistingUsers && (
                                <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">OLD USERS</span>
                              )}
                              {coupon.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">{coupon.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {coupon.discountType === 'percentage'
                                ? `${coupon.discountValue}%`
                                : `₹${coupon.discountValue}`}
                              {coupon.maxDiscount && (
                                <span className="block text-[10px] text-gray-500 font-normal">
                                  max ₹{coupon.maxDiscount}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                              {coupon.minOrderAmount > 0 ? `₹${coupon.minOrderAmount}` : '-'}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                              {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : '/∞'}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                              {coupon.expiryDate
                                ? new Date(coupon.expiryDate).toLocaleDateString()
                                : 'No expiry'}
                              {isExpired && <span className="ml-1 text-red-500 text-[10px] font-bold">EXPIRED</span>}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleCoupon(coupon._id)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  coupon.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {coupon.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditCoupon(coupon)}
                                  className="text-gray-500 hover:text-gray-900 transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteCoupon(coupon._id)}
                                  className="text-gray-500 hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case 'shipping-returns':
        return (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shipping & Returns</h2>
            <p className="text-sm text-gray-600">Manage the policies shown on the product page (Free Shipping, Returns, Secure Payment, etc.).</p>

            {/* Checkout Shipping Charges */}
            <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Checkout Shipping Charges</h3>
              <p className="text-sm text-gray-600 mb-4">Set rule for cart/checkout: free shipping above threshold, otherwise fixed charge.</p>
              <form onSubmit={handleSaveShippingConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Free shipping above (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={shippingConfig.freeShippingThreshold}
                      onChange={(e) => setShippingConfig((prev) => ({ ...prev, freeShippingThreshold: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Shipping charge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={shippingConfig.shippingCharge}
                      onChange={(e) => setShippingConfig((prev) => ({ ...prev, shippingCharge: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={shippingConfigSaving}
                  className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {shippingConfigSaving ? 'Saving...' : 'Save Shipping Settings'}
                </button>
              </form>
            </div>

            {/* Order Timeline — shown on Order Success page */}
            <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Timeline (Order Success page)</h3>
              <p className="text-sm text-gray-600 mb-4">Set the stages and delivery estimate shown after a customer places an order.</p>
              <form onSubmit={handleSaveOrderTimeline} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery estimate — Min days</label>
                    <input
                      type="number"
                      min="1"
                      value={orderTimeline.deliveryDaysMin}
                      onChange={(e) => setOrderTimeline((o) => ({ ...o, deliveryDaysMin: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery estimate — Max days</label>
                    <input
                      type="number"
                      min="1"
                      value={orderTimeline.deliveryDaysMax}
                      onChange={(e) => setOrderTimeline((o) => ({ ...o, deliveryDaysMax: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Timeline steps (label + time estimate)</label>
                  <div className="space-y-2">
                    {(orderTimeline.steps || []).map((step, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={step.label || ''}
                          onChange={(e) => {
                            const steps = [...(orderTimeline.steps || [])];
                            steps[idx] = { ...steps[idx], label: e.target.value };
                            setOrderTimeline((o) => ({ ...o, steps }));
                          }}
                          placeholder="e.g. Order confirmed"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={step.timeEstimate || ''}
                          onChange={(e) => {
                            const steps = [...(orderTimeline.steps || [])];
                            steps[idx] = { ...steps[idx], timeEstimate: e.target.value };
                            setOrderTimeline((o) => ({ ...o, steps }));
                          }}
                          placeholder="e.g. Just now / Within 24hrs"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={orderTimelineSaving}
                  className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {orderTimelineSaving ? 'Saving...' : 'Save Order Timeline'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-brown-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingShippingReturn ? 'Edit Policy' : 'Add New Policy'}
              </h3>
              <form onSubmit={handleCreateOrUpdateShippingReturn} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={shippingReturnForm.title}
                      onChange={(e) => setShippingReturnForm({ ...shippingReturnForm, title: e.target.value })}
                      placeholder="e.g. Free Shipping"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Icon color</label>
                    <select
                      value={shippingReturnForm.iconColor}
                      onChange={(e) => setShippingReturnForm({ ...shippingReturnForm, iconColor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="green">Green (check)</option>
                      <option value="blue">Blue (return)</option>
                      <option value="purple">Purple (lock)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={shippingReturnForm.description}
                    onChange={(e) => setShippingReturnForm({ ...shippingReturnForm, description: e.target.value })}
                    placeholder="e.g. On orders over ₹1,000. Standard delivery in 5-7 business days."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingShippingReturn ? 'Update' : 'Add'}
                  </button>
                  {editingShippingReturn && (
                    <button
                      type="button"
                      onClick={resetShippingReturnForm}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-brown-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Policies ({(shippingReturnsPolicies || []).length})</h3>
                <button onClick={fetchShippingReturns} className="text-sm text-gray-600 hover:text-gray-900 font-medium">Refresh</button>
              </div>
              {loadingShippingReturns ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : (shippingReturnsPolicies || []).length === 0 ? (
                <div className="p-8 text-center text-gray-500">No policies yet. Add one above; they will appear on the product page.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {shippingReturnsPolicies.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{p.order}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{p.description}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditShippingReturn(p)}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteShippingReturn(p._id)}
                                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-brown-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 w-64 bg-gray-900 flex-shrink-0 h-screen lg:h-screen transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-xs text-gray-400 mt-1">Control Center</p>
        </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-2 overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setMessage({ type: '', text: '' });
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors mb-1 rounded ${
                activeSection === item.id
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium text-sm sm:text-base">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 mt-auto">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-sm sm:text-base">Back to Store</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden w-full lg:w-auto">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6">
          {message.text && (
            <div
              className={`rounded-lg px-4 py-3 text-sm mb-4 sm:mb-6 ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {message.text}
            </div>
          )}
          {renderContent()}
        </div>
      </main>

      {/* Success Popup */}
      {successPopup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-[90%] text-center transform animate-popup">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-9 h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Success!</h3>
            <p className="text-gray-600 text-sm">{successPopup.text}</p>
            <button
              onClick={() => setSuccessPopup({ show: false, text: '' })}
              className="mt-5 px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes popupIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-popup { animation: popupIn 0.3s ease-out; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
