import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Safely extract a human-readable error message from an Axios error.
 * Handles both plain strings and Pydantic v2 validation arrays like:
 *   [{type, loc, msg, input, ctx}, ...]
 */
export function extractApiError(err: any, fallback = 'Something went wrong'): string {
    const detail = err?.response?.data?.detail;
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail
            .map((d: any) => (typeof d.msg === 'string' ? d.msg : JSON.stringify(d)))
            .join('; ');
    }
    return fallback;
}

/** Normalise error.response.data.detail in place so it's always a string. */
function normaliseDetail(error: any) {
    const detail = error?.response?.data?.detail;
    if (detail && typeof detail !== 'string') {
        error.response.data.detail = extractApiError(error);
    }
    return Promise.reject(error);
}

// ── Customer API (uses user JWT: viswa_token) ────────────────────────────────
export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('viswa_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use(r => r, normaliseDetail);

// ── Admin API (uses admin JWT: viswa_admin_token) ────────────────────────────
export const adminApi = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('viswa_admin_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
adminApi.interceptors.response.use(r => r, normaliseDetail);

// ── Auth ─────────────────────────────────────────────────────────────────
/**
 * Exchange a Google Sign-In credential (ID token from @react-oauth/google)
 * for a Viswa Sports JWT.
 */
export const googleLogin = (id_token: string) =>
    api.post('/auth/google', { id_token });

/** Email OTP — Step 1: send OTP to email. */
export const sendOtp = (email: string) =>
    api.post('/auth/send-otp', { email });

/** Email OTP — Step 2: verify OTP and get JWT. */
export const verifyOtp = (email: string, otp: string) =>
    api.post('/auth/verify-otp', { email, otp });

export const refreshToken = () => api.post('/auth/refresh');

// ── Turfs ────────────────────────────────────────────────────────────────────
export const getTurfs = (facility_type?: string) =>
    api.get('/turfs', { params: facility_type ? { facility_type } : {} });

export const getTurf = (id: number) => api.get(`/turfs/${id}`);

export const getTurfSlots = (turf_id: number, date: string, token?: string) =>
    api.get(`/turfs/${turf_id}/slots`, {
        params: { date },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

/** Returns the list of date strings (YYYY-MM-DD) that have at least one slot generated. */
export const getTurfAvailableDates = (turf_id: number) =>
    api.get<{ dates: string[] }>(`/turfs/${turf_id}/available-dates`);


// ── Features (public) ────────────────────────────────────────────────────────
export const getFeatures = () => api.get('/features');

// ── Discounts / Coupons (public) ─────────────────────────────────────────────
export const validateCoupon = (code: string, subtotal: number, slot_count: number = 1) =>
    api.post('/discounts/validate', { code, subtotal, slot_count });

/** Fetch all currently-active named coupons for the user gallery */
export const getActiveCoupons = () => api.get('/discounts');

// ── Bookings ─────────────────────────────────────────────────────────────────
export const createBooking = (data: {
    turf_id: number;
    date: string;
    slot_ids: number[];
    feature_ids?: number[];
    discount_code?: string;
    with_bowling_machine?: boolean;
}) => api.post('/bookings', data);

export const checkMachineAvailability = (turf_id: number, date: string, slot_ids: number[]) =>
    api.get(`/turfs/${turf_id}/machine-availability`, {
        params: { date, slot_ids: slot_ids.join(',') },
    });

export const getMyBookings = (skip = 0, limit = 20) =>
    api.get('/bookings/me', { params: { skip, limit } });

export const cancelBooking = (bookingId: number) =>
    api.post(`/bookings/${bookingId}/cancel`);

// ── Payments ─────────────────────────────────────────────────────────────────
export const createOrder = (booking_id: number, payment_type: 'full' | 'advance' = 'full') =>
    api.post('/payments/create-order', { booking_id, payment_type });

export const verifyPayment = (data: {
    booking_id: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}) => api.post('/payments/verify', data);

// ── User profile ─────────────────────────────────────────────────────────────
export const getMyProfile = () => api.get('/users/me');
export const updateMyProfile = (data: { name?: string; email?: string; mobile_number?: string }) =>
    api.patch('/users/me', data);


// ── Admin Auth ───────────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
    api.post('/admin/auth/login', { email, password });

export const adminRefreshToken = () => adminApi.post('/admin/auth/refresh');

// ── Admin: Turfs ─────────────────────────────────────────────────────────────
export const adminGetTurfs = () => adminApi.get('/admin/turfs');
export const adminCreateTurf = (data: any) => adminApi.post('/admin/turfs', data);
export const adminUpdateTurf = (id: number, data: any) => adminApi.patch(`/admin/turfs/${id}`, data);
export const adminDeleteTurf = (id: number) => adminApi.delete(`/admin/turfs/${id}/permanent`);
export const adminGetTurfDeleteSummary = (id: number) => adminApi.get(`/admin/turfs/${id}/delete-summary`);

/** Upload a turf image (multipart/form-data). Returns { url, image_urls }. */
export const adminUploadTurfImage = (turfId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return adminApi.post(`/admin/turfs/${turfId}/upload-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// ── Admin: Analytics ─────────────────────────────────────────────────────────
export const adminGetAnalytics = () => adminApi.get('/admin/analytics/summary');
export const adminGetBookingAnalytics = (from?: string, to?: string) =>
    adminApi.get('/admin/analytics/bookings', { params: { from_date: from, to_date: to } });

// ── Admin: Features ───────────────────────────────────────────────────────────
export const adminGetFeatures = () => adminApi.get('/admin/features');
export const adminCreateFeature = (data: any) => adminApi.post('/admin/features', data);

// ── Admin: Discounts ──────────────────────────────────────────────────────────
export const adminGetDiscounts = () => adminApi.get('/admin/discounts');
export const adminCreateDiscount = (data: any) => adminApi.post('/admin/discounts', data);
export const adminUpdateDiscount = (id: number, data: any) => adminApi.patch(`/admin/discounts/${id}`, data);
export const adminDeleteDiscount = (id: number) => adminApi.delete(`/admin/discounts/${id}`);

// ── Admin: Slots ──────────────────────────────────────────────────────────────
export const adminGenerateSlotsBulk = (data: { turf_id: number; start_date: string; days: number }) =>
    adminApi.post('/admin/slots/generate-bulk', data);

export const adminGetSlots = (turf_id: number, date: string) =>
    adminApi.get('/admin/slots', { params: { turf_id, date } });

export const adminBlockSlots = (data: { turf_id: number; date: string; slot_ids: number[]; action: 'block' | 'unblock' }) =>
    adminApi.post('/admin/slots/block', data);

export const adminGetAllBookings = (params?: { turf_id?: number; status?: string; from_date?: string; to_date?: string; skip?: number; limit?: number }) =>
    adminApi.get('/admin/slots/booked', { params });

// ── Advertisements (public) ───────────────────────────────────────────────────
export const getActiveAd = () => api.get('/advertisements/active');

// ── Admin: Advertisements ─────────────────────────────────────────────────────
export const adminGetAds = () => adminApi.get('/admin/advertisements');
export const adminCreateAd = (formData: FormData) =>
    adminApi.post('/admin/advertisements', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const adminUpdateAd = (id: number, formData: FormData) =>
    adminApi.patch(`/admin/advertisements/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const adminDeleteAd = (id: number) => adminApi.delete(`/admin/advertisements/${id}`);

// ── Admin: Pricing Rules ───────────────────────────────────────────────────────
export const adminGetPricingRules = (turfId: number) =>
    adminApi.get(`/admin/pricing/${turfId}`);

export const adminCreatePricingRule = (data: {
    turf_id: number;
    start_time: string;
    end_time: string;
    price: number;
    day_type: 'all' | 'weekday' | 'weekend';
}) => adminApi.post('/admin/pricing', data);

export const adminDeletePricingRule = (ruleId: number) =>
    adminApi.delete(`/admin/pricing/${ruleId}`);
