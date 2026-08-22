import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { profileAPI, returnsAPI, orderAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FileText } from 'lucide-react';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '../utils/cloudinary';

// --- ICONS (Minimalist / Stroke Style) ---
const IconUser = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconShoppingBag = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);
const IconHeart = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const IconShoppingCart = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const IconMapPin = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconBell = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.007 2.007 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const IconShieldCheck = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.002 12.002 0 002.944 12c.047 1.994.496 3.931 1.258 5.728a11.97 11.97 0 006.183 4.288c.376.108.775.108 1.151 0a11.97 11.97 0 006.183-4.288c.762-1.797 1.211-3.734 1.258-5.728a12.002 12.002 0 00-1.742-9.056z" />
  </svg>
);
const IconLogout = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const IconAdmin = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.002 12.002 0 002.944 12c.047 1.994.496 3.931 1.258 5.728a11.97 11.97 0 006.183 4.288c.376.108.775.108 1.151 0a11.97 11.97 0 006.183-4.288c.762-1.797 1.211-3.734 1.258-5.728a12.002 12.002 0 00-1.742-9.056z" />
  </svg>
);
const IconChevronRight = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
  </svg>
);

const RETURN_DAYS = 30;
function getReturnWindowEnd(order) {
  const base = order.deliveredDate ? new Date(order.deliveredDate) : new Date(order.orderDate);
  const end = new Date(base);
  end.setDate(end.getDate() + RETURN_DAYS);
  return end;
}
function canReturnOrder(order) {
  if (!order) return false;
  const s = (order.status || '').toLowerCase();
  if (s !== 'delivered' && s !== 'shipped') return false;
  return new Date() <= getReturnWindowEnd(order);
}

// OrderRow component for displaying order with return
const OrderRow = ({ order, user, canReturn, alreadyRequested, returnStatus, returnRejectReason, onOpenReturn, onOpenCancelModal }) => {
  const canCancel =
    order?.status === 'pending' ||
    order?.status === 'processing' ||
    order?.status === 'shipped';

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">
        <Link 
          to={`/orders/${order._id}`}
          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          #{order._id?.slice(-6).toUpperCase()}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
          ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
            order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 text-right font-medium">
        ₹{order.totalAmount?.toLocaleString()}
      </td>
      <td className="px-6 py-4 text-center">
          {alreadyRequested ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium text-gray-500 capitalize">{returnStatus || 'Requested'}</span>
              {returnStatus === 'rejected' && returnRejectReason && (
                <span className="text-xs text-red-600 max-w-[180px] truncate" title={returnRejectReason}>Reason: {returnRejectReason}</span>
              )}
            </div>
          ) : canReturn ? (
            <button
              type="button"
              onClick={() => onOpenReturn(order)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
            >
              Return
            </button>
          ) : canCancel ? (
            <button
              type="button"
              onClick={() => onOpenCancelModal(order)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
            >
              Cancel order
            </button>
          ) : (
            <span className="text-xs text-gray-400" title={order?.status === 'cancelled' ? 'Order cancelled' : 'Return window closed'}>
              {order?.status === 'cancelled' ? '—' : 'Return'}
            </span>
          )}
        </td>
    </tr>
  );
};

const Profile = () => {
  const { user: authUser, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myReturns, setMyReturns] = useState([]);
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [returnForm, setReturnForm] = useState({ reason: '', photoUrls: [], videoUrl: '', photoFiles: [], videoFile: null });
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnUploadProgress, setReturnUploadProgress] = useState({ photos: 0, video: 0 });
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Menu items config
  const menuItems = [
    { id: 'profile', label: 'General', icon: IconUser, description: 'Personal details & address' },
    { id: 'orders', label: 'Orders', icon: IconShoppingBag, description: 'History & status' },
    { id: 'security', label: 'Security', icon: IconShieldCheck, description: 'Password' },
    { id: 'notifications', label: 'Notifications', icon: IconBell, description: 'Email & SMS preferences' },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setProfileData(null);
      setIsLoading(false);
      return;
    }
    loadProfile();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      if (tab === 'payments') setActiveTab('profile');
      else setActiveTab(tab);
    }
    if (searchParams.get('payment') === 'success') {
      setSuccess('Payment successful! Your order has been placed.');
      navigate('/profile?tab=orders', { replace: true });
    }
  }, [searchParams, navigate]);

  const loadReturns = async () => {
    try {
      const res = await returnsAPI.getMyReturns();
      if (res?.success && Array.isArray(res.data?.returns)) setMyReturns(res.data.returns);
    } catch (e) {
      console.error('Load returns error:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders' && profileData?.orders?.length) loadReturns();
  }, [activeTab, profileData?.orders?.length]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await profileAPI.getProfile();
      if (response.success) {
        setProfileData(response.data);
        const user = response.data.user;
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address
            ? `${user.address.address || ''}, ${user.address.city || ''}, ${user.address.state || ''}, ${user.address.country || 'India'}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
            : '',
        });
      } else {
        setError(response.message || 'Failed to load profile data.');
      }
    } catch (err) {
      setError('Failed to load profile data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let addressObj = null;
      if (formData.address && formData.address.trim()) {
        const parts = formData.address.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length > 0) {
          addressObj = {
            address: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            country: parts[3] || 'India',
          };
        }
      }

      const updateData = {
        name: formData.name,
        phone: formData.phone,
      };

      if (addressObj) updateData.address = addressObj;

      const response = await profileAPI.updateProfile(updateData);
      if (response.success) {
        setSuccess('Profile updated successfully!');
        await loadProfile();
      } else {
        setError(response.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Failed to update profile.');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnModalOrder?._id || !returnForm.reason?.trim()) {
      setError('Please provide a reason for the return.');
      return;
    }
    setReturnSubmitting(true);
    setError('');
    try {
      let photoUrls = [...(returnForm.photoUrls || [])];
      if (returnForm.photoFiles?.length) {
        setReturnUploadProgress((p) => ({ ...p, photos: 0 }));
        const total = returnForm.photoFiles.length;
        for (let i = 0; i < returnForm.photoFiles.length; i++) {
          const res = await uploadImageToCloudinary(returnForm.photoFiles[i], (percent) =>
            setReturnUploadProgress((p) => ({ ...p, photos: Math.round(((i + percent / 100) / total) * 100) }))
          );
          if (res?.url) photoUrls.push(res.url);
        }
      }
      let videoUrl = returnForm.videoUrl || '';
      if (returnForm.videoFile) {
        setReturnUploadProgress((p) => ({ ...p, video: 0 }));
        const res = await uploadVideoToCloudinary(returnForm.videoFile, (percent) =>
          setReturnUploadProgress((p) => ({ ...p, video: percent }))
        );
        if (res?.url) videoUrl = res.url;
      }
      const payload = {
        orderId: returnModalOrder._id,
        reason: returnForm.reason.trim(),
        photoUrls: photoUrls.filter(Boolean),
        ...(videoUrl && { videoUrl }),
      };
      const response = await returnsAPI.createReturn(payload);
      if (response?.success) {
        setSuccess('Return request submitted successfully.');
        setReturnModalOrder(null);
        setReturnForm({ reason: '', photoUrls: [], videoUrl: '', photoFiles: [], videoFile: null });
        setReturnUploadProgress({ photos: 0, video: 0 });
        await loadReturns();
        await loadProfile();
      } else {
        setError(response?.message || 'Failed to submit return request.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to submit return request.');
    } finally {
      setReturnSubmitting(false);
      setReturnUploadProgress({ photos: 0, video: 0 });
    }
  };

  const closeReturnModal = () => {
    if (!returnSubmitting) {
      setReturnModalOrder(null);
      setReturnForm({ reason: '', photoUrls: [], videoUrl: '', photoFiles: [], videoFile: null });
      setReturnUploadProgress({ photos: 0, video: 0 });
      setError('');
    }
  };

  const handleCancelOrderSubmit = async (e) => {
    e.preventDefault();
    if (!cancelModalOrder?._id || !cancelReason?.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }
    setCancelLoadingId(cancelModalOrder._id);
    setError('');
    try {
      const res = await orderAPI.cancelOrder(cancelModalOrder._id, { reason: cancelReason.trim() });
      if (res?.success) {
        const ref = res?.data?.refund;
        let msg = 'Order cancelled.';
        if (ref?.amountRupees != null && Number(ref.amountRupees) > 0) {
          msg = `Order cancelled. Refund of ₹${Number(ref.amountRupees).toLocaleString('en-IN')} is being processed.`;
        } else if (
          ref?.skipped === 'cod_post_dispatch_no_advance_refund' ||
          ref?.skipped === 'zero_refund_amount'
        ) {
          msg = 'Order cancelled. No payment refund applies for this cancellation (per policy).';
        }
        setSuccess(msg);
        setCancelModalOrder(null);
        setCancelReason('');
        await loadProfile();
        await loadReturns();
      } else {
        setError(res?.message || 'Failed to cancel order.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to cancel order.');
    } finally {
      setCancelLoadingId(null);
    }
  };

  const closeCancelModal = () => {
    if (!cancelLoadingId) {
      setCancelModalOrder(null);
      setCancelReason('');
      setError('');
    }
  };

  // Reusable Input Style (Matches Login/Signup)
  const inputClass = "block w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition duration-150 ease-in-out placeholder-gray-400";
  const labelClass = "block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2";

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null; // Or redirect logic handled by router

  const { user } = profileData || {};
  const displayName = user?.name || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();
  const isAdmin = authUser?.isAdmin || user?.isAdmin;

  return (
    <div className="min-h-screen bg-brown-50 font-sans text-brown-800">

      {/* HEADER STRIP */}
      <div className="bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <span className="h-6 w-px bg-gray-200"></span>
            <h1 className="text-lg font-semibold tracking-tight">Account Settings</h1>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95">
            <IconLogout className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="lg:col-span-3 space-y-8">
            {/* User Mini Card */}
            <div className="flex items-center gap-4 px-2">
              <div className="h-10 w-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{displayName}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Nav Menu */}
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id
                      ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-gray-100/50'
                    }`}
                >
                  <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-zinc-900' : 'text-zinc-400'}`} />
                  {item.label}
                  {activeTab === item.id && <IconChevronRight className="w-4 h-4 ml-auto text-zinc-400" />}
                </button>
              ))}
              {isAdmin && (
                <Link to="/admin" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-gray-100/50">
                  <IconAdmin className="w-4 h-4 text-zinc-400" />
                  Admin Dashboard
                </Link>
              )}
            </nav>

            {/* Quick Stats (Mini) */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
              <Link to="/orders" className="bg-white p-3 rounded-lg border border-gray-100 text-center hover:border-gray-300 transition-colors">
                <span className="block text-xl font-bold">{profileData?.orders?.length || 0}</span>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">Orders</span>
              </Link>
            </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px]">

              {/* Content Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    {menuItems.find(i => i.id === activeTab)?.label}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {menuItems.find(i => i.id === activeTab)?.description}
                  </p>
                </div>
              </div>

              {/* Notifications & Messages */}
              {(error || success) && (
                <div className={`mx-6 mt-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  {error || success}
                </div>
              )}

              <div className="p-6">
                {/* --- TAB: PROFILE --- */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Email Address</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={formData.email}
                            disabled
                            className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-medium text-zinc-400 bg-gray-100 px-2 py-0.5 rounded">
                            Verified
                          </span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Delivery Address</label>
                        <textarea
                          name="address"
                          rows="3"
                          value={formData.address}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Street, City, State, Zip, Country"
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                      <button type="submit" className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors shadow-sm">
                        Save Changes
                      </button>
                      <button type="button" onClick={loadProfile} className="px-5 py-2.5 bg-white text-zinc-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                        Reset
                      </button>
                    </div>
                  </form>
                )}

                {/* --- TAB: ORDERS (Table View) --- */}
                {activeTab === 'orders' && (
                  <div>
                    {profileData?.orders && profileData.orders.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Return</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {profileData.orders.map((order) => {
                              const returnForOrder = myReturns.find((r) => {
                                const oid = r.order?._id ?? r.order;
                                return oid && String(oid) === String(order._id);
                              });
                              return (
                                <OrderRow
                                  key={order._id}
                                  order={order}
                                  user={profileData.user}
                                  canReturn={canReturnOrder(order)}
                                  alreadyRequested={!!returnForOrder}
                                  returnStatus={returnForOrder?.status}
                                  returnRejectReason={returnForOrder?.status === 'rejected' ? (returnForOrder?.adminNotes || '') : ''}
                                  onOpenReturn={() => {
                                setReturnForm({ reason: '', photoUrls: [], videoUrl: '', photoFiles: [], videoFile: null });
                                setReturnModalOrder(order);
                              }}
                                  onOpenCancelModal={(order) => {
                                setCancelModalOrder(order);
                                setCancelReason('');
                              }}
                                />
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <IconShoppingBag className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No orders placed yet</h3>
                        <Link to="/" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800">
                          Browse Products
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Return Request Modal */}
                {returnModalOrder && (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={closeReturnModal}>
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
                        <h2 className="text-lg font-bold text-zinc-900">Request Return — #{returnModalOrder._id?.slice(-6).toUpperCase()}</h2>
                        <button type="button" onClick={closeReturnModal} disabled={returnSubmitting} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <form onSubmit={handleReturnSubmit} className="p-6 space-y-5">
                        <div>
                          <label className={labelClass}>Reason for return *</label>
                          <textarea
                            name="reason"
                            value={returnForm.reason}
                            onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))}
                            placeholder="Describe why you want to return this order..."
                            rows={4}
                            className={inputClass}
                            required
                            disabled={returnSubmitting}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Product photos</label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => setReturnForm((f) => ({ ...f, photoFiles: e.target.files ? Array.from(e.target.files) : [] }))}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
                            disabled={returnSubmitting}
                          />
                          {returnSubmitting && returnForm.photoFiles?.length > 0 && (
                            <p className="mt-1 text-xs text-gray-500">Uploading photos... {returnUploadProgress.photos}%</p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Product video (optional)</label>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setReturnForm((f) => ({ ...f, videoFile: e.target.files?.[0] || null }))}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
                            disabled={returnSubmitting}
                          />
                          {returnSubmitting && returnForm.videoFile && (
                            <p className="mt-1 text-xs text-gray-500">Uploading video... {returnUploadProgress.video}%</p>
                          )}
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={closeReturnModal} disabled={returnSubmitting} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            Cancel
                          </button>
                          <button type="submit" disabled={returnSubmitting} className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                            {returnSubmitting ? 'Submitting...' : 'Submit return request'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Cancel Order Modal */}
                {cancelModalOrder && (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={closeCancelModal}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8" onClick={(e) => e.stopPropagation()}>
                      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
                        <h2 className="text-lg font-bold text-zinc-900">Cancel order — #{cancelModalOrder._id?.slice(-6).toUpperCase()}</h2>
                        <button type="button" onClick={closeCancelModal} disabled={!!cancelLoadingId} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <form onSubmit={handleCancelOrderSubmit} className="p-6 space-y-4">
                        <div>
                          <label className={labelClass}>Reason for cancellation *</label>
                          <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Why do you want to cancel this order?"
                            rows={3}
                            className={inputClass}
                            required
                            disabled={!!cancelLoadingId}
                          />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={closeCancelModal} disabled={!!cancelLoadingId} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            Back
                          </button>
                          <button type="submit" disabled={!!cancelLoadingId || !cancelReason.trim()} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                            {cancelLoadingId ? 'Cancelling...' : 'Cancel order'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* --- TAB: SECURITY --- */}
                {activeTab === 'security' && (
                  <div className="max-w-2xl space-y-6">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Password</h4>
                        <p className="text-xs text-zinc-500 mt-1">Last changed 30 days ago</p>
                      </div>
                      <button className="text-sm font-medium text-zinc-900 hover:underline">Update</button>
                    </div>
                  </div>
                )}

                {/* --- TAB: NOTIFICATIONS --- */}
                {activeTab === 'notifications' && (
                  <div className="max-w-2xl space-y-2">
                    {[
                      { id: 'email', title: 'Order Updates', description: 'Get notified when your order status changes.' },
                      { id: 'promo', title: 'Promotional Emails', description: 'Receive emails about new products and sales.' },
                    ].map((item) => (
                      <label key={item.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex h-5 items-center">
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-zinc-900 focus:ring-zinc-900" defaultChecked />
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-zinc-900">{item.title}</span>
                          <span className="block text-xs text-zinc-500 mt-1">{item.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;