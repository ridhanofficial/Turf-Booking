'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getTurf, getTurfSlots, getTurfAvailableDates, createBooking, createOrder, getFeatures, validateCoupon } from '@/lib/api';
import CouponGallery from '@/components/CouponGallery';

interface Slot { id: number; start_time: string; end_time: string; price: number; status: string; held_by_me?: boolean; machine_available?: boolean | null; }
interface Feature { id: number; name: string; extra_price: number; }

declare global { interface Window { Razorpay: any; } }

const BOWLING_MACHINE_PRICE = 200;

const SLOT_COLORS: Record<string, React.CSSProperties> = {
    available: { background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.4)', color: '#00FF88', cursor: 'pointer' },
    held: { background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700', cursor: 'not-allowed' },
    held_by_me: { background: 'rgba(0,229,153,0.1)', border: '2px dashed rgba(0,229,153,0.45)', color: '#00e599', cursor: 'pointer' },
    booked: { background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.4)', color: '#FF4444', cursor: 'not-allowed' },
    disabled: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#4A5568', cursor: 'not-allowed' },
    selected: { background: 'rgba(0,229,153,0.18)', border: '2px solid #00e599', color: '#00e599', cursor: 'pointer' },
};

const FACILITY_LABELS: Record<string, string> = {
    full_pitch: 'Full Turf Pitch',
    net_normal: 'Net — Normal Surface',
    net_cement: 'Net — Cement Surface',
};

// ── Calendar Picker ─────────────────────────────────────────────────────────
function CalendarPicker({
    value, min, max, onChange, availableDates,
}: {
    value: string;
    min: string;
    max: string;
    onChange: (d: string) => void;
    availableDates?: Set<string>; // only these dates are selectable; undefined = all
}) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const parseD = (s: string) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
    const toStr = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

    const selParts = parseD(value);
    const [viewYear, setViewYear] = useState(selParts.y);
    const [viewMonth, setViewMonth] = useState(selParts.m); // 1-12

    const minP = parseD(min);
    const maxP = parseD(max);

    const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
    const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun

    const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else { setViewMonth(m => m - 1); } };
    const nextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else { setViewMonth(m => m + 1); } };

    const canPrev = viewYear > minP.y || (viewYear === minP.y && viewMonth > minP.m);
    const canNext = viewYear < maxP.y || (viewYear === maxP.y && viewMonth < maxP.m);

    const totalD = daysInMonth(viewYear, viewMonth);
    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: totalD }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const todayStr = new Date().toISOString().split('T')[0];
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div style={{ userSelect: 'none' }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button onClick={prevMonth} disabled={!canPrev} style={{ background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'not-allowed', color: canPrev ? '#00e599' : '#2D3748', fontSize: 18, lineHeight: 1, padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s' }}>‹</button>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#F0F4F8', fontFamily: 'Outfit, sans-serif' }}>{MONTH_NAMES[viewMonth - 1]} {viewYear}</span>
                <button onClick={nextMonth} disabled={!canNext} style={{ background: 'none', border: 'none', cursor: canNext ? 'pointer' : 'not-allowed', color: canNext ? '#00e599' : '#2D3748', fontSize: 18, lineHeight: 1, padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s' }}>›</button>
            </div>
            {/* Day-of-week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#4A5568', padding: '4px 0' }}>{d}</div>)}
            </div>
            {/* Date cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const dateStr = toStr(viewYear, viewMonth, day);
                    const isSelected = dateStr === value;
                    const isToday = dateStr === todayStr;
                    // Disabled if: out of min/max range, OR not in the availableDates set (when set is loaded)
                    const outOfRange = dateStr < min || dateStr > max;
                    const noSlots = availableDates !== undefined && !availableDates.has(dateStr);
                    const isDisabled = outOfRange || noSlots;
                    return (
                        <button
                            key={idx}
                            onClick={() => !isDisabled && onChange(dateStr)}
                            title={noSlots ? 'No slots available' : undefined}
                            style={{
                                border: isSelected ? '2px solid #00e599' : isToday ? '1px solid rgba(0,229,153,0.4)' : '1px solid transparent',
                                borderRadius: 9,
                                padding: '8px 0',
                                fontSize: 13,
                                fontWeight: isSelected || isToday ? 700 : 400,
                                background: isSelected ? 'rgba(0,229,153,0.22)' : isToday ? 'rgba(0,229,153,0.07)' : 'rgba(255,255,255,0.03)',
                                color: isDisabled ? '#2D3748' : isSelected ? '#00e599' : '#F0F4F8',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.12s',
                                outline: 'none',
                                boxShadow: isSelected ? '0 0 10px rgba(0,229,153,0.3)' : 'none',
                                // Strikethrough for no-slots dates
                                textDecoration: noSlots ? 'line-through' : 'none',
                                opacity: noSlots ? 0.3 : 1,
                            }}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
            {/* Selected date display */}
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#00e599', fontWeight: 600 }}>
                📅 {new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
        </div>
    );
}


// ── Payment Selection Modal ───────────────────────────────────────────────────
function PaymentSelectionModal({
    totalPrice,
    advanceAmount,
    onClose,
    onSelect,
}: {
    totalPrice: number;
    advanceAmount: number | null;
    onClose: () => void;
    onSelect: (type: 'full' | 'advance') => void;
}) {
    const remaining = advanceAmount ? totalPrice - advanceAmount : 0;
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(0,229,153,0.15)',
                    borderRadius: 28, padding: '44px 36px',
                    maxWidth: 500, width: '100%',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 80px rgba(0,0,0,0.7)',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
                        background: 'rgba(0,229,153,0.1)',
                        border: '1px solid rgba(0,229,153,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    }}>💳</div>
                    <h2 style={{
                        fontSize: 26, fontWeight: 900, fontFamily: 'Outfit, sans-serif',
                        color: '#F0F4F8', marginBottom: 6, letterSpacing: '-0.3px',
                    }}>Choose Payment</h2>
                    <p style={{ color: '#8B9CB0', fontSize: 14 }}>
                        Total booking amount:{' '}
                        <strong style={{ color: '#00e599', fontSize: 16 }}>₹{totalPrice}</strong>
                    </p>
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Advance Payment — only if configured */}
                    {advanceAmount && advanceAmount < totalPrice && (
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(255,215,0,0.2)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect('advance')}
                            style={{
                                background: 'rgba(255,215,0,0.08)',
                                border: '1.5px solid rgba(255,215,0,0.4)',
                                borderRadius: 18, padding: '22px 24px', textAlign: 'left',
                                cursor: 'pointer', width: '100%', transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 22 }}>⚡</span>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: '#F0F4F8', fontFamily: 'Outfit, sans-serif' }}>Advance Payment</div>
                                        <div style={{ fontSize: 11, color: '#FFD700', fontWeight: 600, marginTop: 2 }}>Pay now → Rest at venue</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700', fontFamily: 'Outfit, sans-serif' }}>₹{advanceAmount}</div>
                            </div>
                            <div style={{
                                padding: '8px 12px', borderRadius: 10,
                                background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.15)',
                                fontSize: 12, color: '#8B9CB0', marginTop: 4,
                            }}>
                                🏟️ Remaining <strong style={{ color: '#FFD700' }}>₹{remaining}</strong> to be paid at the venue
                            </div>
                        </motion.button>
                    )}

                    {/* Full Payment */}
                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(0,212,255,0.2)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect('full')}
                        style={{
                            background: 'rgba(0,229,153,0.08)',
                            border: '1.5px solid rgba(0,229,153,0.3)',
                            borderRadius: 18, padding: '22px 24px', textAlign: 'left',
                            cursor: 'pointer', width: '100%', transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 22 }}>✅</span>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#F0F4F8', fontFamily: 'Outfit, sans-serif' }}>Full Payment</div>
                                    <div style={{ fontSize: 11, color: '#00FF88', fontWeight: 600, marginTop: 2 }}>Pay everything now</div>
                                </div>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: '#00e599', fontFamily: 'Outfit, sans-serif' }}>₹{totalPrice}</div>
                        </div>
                        <div style={{
                            padding: '8px 12px', borderRadius: 10,
                            background: 'rgba(0,229,153,0.05)', border: '1px solid rgba(0,229,153,0.1)',
                            fontSize: 12, color: '#8B9CB0', marginTop: 4,
                        }}>
                            🎟️ Booking confirmed instantly. No balance due at venue.
                        </div>
                    </motion.button>
                </div>

                {/* Cancel */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%', marginTop: 20,
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#4A5568', padding: '11px', borderRadius: 12, cursor: 'pointer',
                        fontSize: 13, fontFamily: 'Inter, sans-serif', transition: 'color 0.2s',
                    }}
                >
                    ← Go back
                </button>
            </motion.div>
        </div>
    );
}

// ── Main Booking Page ─────────────────────────────────────────────────────────
export default function BookingPage() {
    const { id } = useParams();
    const router = useRouter();
    const [turf, setTurf] = useState<any>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [availableDates, setAvailableDates] = useState<Set<string> | undefined>(undefined);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);
    const [filterMachine, setFilterMachine] = useState(false);
    // Payment selection modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingBookingId, setPendingBookingId] = useState<number | null>(null);
    const [showVerifyingOverlay, setShowVerifyingOverlay] = useState(false);
    const [showLoadingRazorpay, setShowLoadingRazorpay] = useState(false);
    const HOLD_SECONDS = 5 * 60;  // must match backend SLOT_HOLD_MINUTES = 5
    const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);
    const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponData, setCouponData] = useState<{ discount_amount: number; final_price: number; message: string; code: string } | null>(null);
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    const isNetFacility = turf?.facility_type === 'net_normal' || turf?.facility_type === 'net_cement';

    useEffect(() => {
        getTurf(Number(id)).then(r => setTurf(r.data)).catch(() => { });
        getFeatures().then(r => setFeatures(r.data)).catch(() => { });
        // fetch dates that actually have slots generated
        getTurfAvailableDates(Number(id))
            .then(r => {
                const dateSet = new Set<string>(r.data.dates);
                setAvailableDates(dateSet);
                // If today has no slots, jump to the first available date
                const today = new Date().toISOString().split('T')[0];
                if (dateSet.size > 0 && !dateSet.has(today)) {
                    setSelectedDate(r.data.dates[0]);
                }
            })
            .catch(() => { /* keep undefined → all dates selectable as fallback */ });
    }, [id]);

    useEffect(() => {
        if (!id || !selectedDate) return;
        setSlotsLoading(true);
        setSelectedSlots([]);

        if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
        setHoldSecondsLeft(null);
        const token = localStorage.getItem('viswa_token');
        getTurfSlots(Number(id), selectedDate, token || undefined)
            .then(r => {
                setSlots(r.data);
                // Pre-select slots held by this user so they can resume
                const myHeld = (r.data as Slot[]).filter(s => s.held_by_me).map(s => s.id);
                if (myHeld.length > 0) {
                    setSelectedSlots(myHeld);
                    startHoldTimer();
                }
            })
            .catch(() => setSlots([]))
            .finally(() => setSlotsLoading(false));
    }, [id, selectedDate]);

    // Derive machine availability from per-slot data already loaded from the backend
    const selectedSlotObjects = slots.filter(s => selectedSlots.includes(s.id));
    const machineAvailableForSelection =
        selectedSlots.length > 0 &&
        selectedSlotObjects.every(s => s.machine_available === true);

    const startHoldTimer = useCallback(() => {
        if (holdTimerRef.current) return;
        setHoldSecondsLeft(HOLD_SECONDS);
        holdTimerRef.current = setInterval(() => {
            setHoldSecondsLeft(prev => {
                if (prev === null || prev <= 1) {
                    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const stopHoldTimer = useCallback(() => {
        if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
        setHoldSecondsLeft(null);
    }, []);

    useEffect(() => () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current); }, []);

    const toggleSlot = (slot: Slot) => {
        // Allow clicking available slots OR the user's own held slots
        const canInteract = slot.status === 'available' || slot.held_by_me;
        if (!canInteract) return;
        const prev = selectedSlots;
        if (prev.includes(slot.id)) {
            const ordered = slots.filter(s => prev.includes(s.id)).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const firstId = ordered[0]?.id;
            const lastId = ordered[ordered.length - 1]?.id;
            if (slot.id !== firstId && slot.id !== lastId) {
                toast.error('You can only deselect from the start or end of your selection.');
                return;
            }
            const next = prev.filter(s => s !== slot.id);
            setSelectedSlots(next);
            if (next.length === 0) stopHoldTimer();
            return;
        }
        if (prev.length === 0) {
            setSelectedSlots([slot.id]);
            startHoldTimer();
            return;
        }
        const ordered = slots.filter(s => prev.includes(s.id)).sort((a, b) => a.start_time.localeCompare(b.start_time));
        const first = ordered[0];
        const last = ordered[ordered.length - 1];
        // Guard: if previously selected slots no longer exist in current slots array
        // (can happen during date change / slot refresh race), start fresh.
        if (!first || !last) {
            setSelectedSlots([slot.id]);
            stopHoldTimer();
            startHoldTimer();
            return;
        }
        const slotBefore = slots.find(s => s.end_time === first.start_time);
        const slotAfter = slots.find(s => s.start_time === last.end_time);
        if (slot.id === slotBefore?.id || slot.id === slotAfter?.id) {
            setSelectedSlots([...prev, slot.id]);
            return;
        }
        // Non-consecutive slot clicked — reset selection and start fresh from this slot
        setSelectedSlots([slot.id]);
        stopHoldTimer();
        startHoldTimer();
    };

    // Determine effective display style: held_by_me slots not yet selected show as a dashed blue hint
    const getSlotStyle = (slot: Slot, isSelected: boolean): React.CSSProperties => {
        if (isSelected) return SLOT_COLORS.selected;
        if (slot.held_by_me) return SLOT_COLORS.held_by_me;
        return SLOT_COLORS[slot.status] || SLOT_COLORS.disabled;
    };

    const slotTotal = slots.filter(s => selectedSlots.includes(s.id)).reduce((sum, s) => sum + Number(s.price), 0);
    const machinePricePerSlot = turf?.bowling_machine_price ? Number(turf.bowling_machine_price) : BOWLING_MACHINE_PRICE;
    const machineTotal = filterMachine ? machinePricePerSlot * selectedSlots.length : 0;
    const featureTotal = features.filter(f => selectedFeatures.includes(f.id)).reduce((sum, f) => sum + Number(f.extra_price), 0);
    const grandTotal = slotTotal + machineTotal + featureTotal;
    // Discounted total (applied only when a valid coupon is present)
    const discountAmount = couponData ? couponData.discount_amount : 0;
    const finalTotal = grandTotal - discountAmount;

    // When grandTotal changes, invalidate coupon (price may have changed)
    useEffect(() => { setCouponData(null); setCouponCode(''); }, [grandTotal]);

    const handleApplyCoupon = async () => {
        const trimmed = couponCode.trim();
        if (!trimmed) { toast.error('Enter a coupon code first'); return; }
        if (grandTotal === 0) { toast.error('Select slots first'); return; }
        setApplyingCoupon(true);
        try {
            const res = await validateCoupon(trimmed, grandTotal, selectedSlots.length);
            setCouponData(res.data);
            toast.success(res.data.message, { duration: 4000, icon: '🎟️' });
        } catch (err: any) {
            setCouponData(null);
            toast.error(err?.response?.data?.detail || 'Invalid coupon code');
        } finally {
            setApplyingCoupon(false);
        }
    };

    const removeCoupon = () => { setCouponData(null); setCouponCode(''); };

    // Determine if advance payment is available for this turf
    const advanceAmount = turf?.advance_payment_amount ? Number(turf.advance_payment_amount) : null;

    // ── Load Razorpay SDK ──────────────────────────────────────────────────────
    const loadRazorpay = async () => {
        if (!window.Razorpay) {
            await new Promise<void>(resolve => {
                const s = document.createElement('script');
                s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                s.onload = () => resolve();
                document.body.appendChild(s);
            });
        }
    };

    // ── Open Razorpay with the chosen payment type ────────────────────────────
    const openRazorpay = async (bookingId: number, paymentType: 'full' | 'advance') => {
        const token = localStorage.getItem('viswa_token')!;
        setShowLoadingRazorpay(true);
        try {
            const orderRes = await createOrder(bookingId, paymentType);
            const order = orderRes.data;
            await loadRazorpay();
            const descParts = [`Booking #${bookingId}`];
            if (paymentType === 'advance') descParts.push(`Advance ₹${order.amount_paid} | Balance ₹${order.remaining_amount} at venue`);
            const rzp = new window.Razorpay({
                key: order.key,
                amount: order.amount,
                currency: order.currency,
                name: 'Viswa Sports',
                description: descParts.join(' — '),
                order_id: order.order_id,
                handler: async (response: any) => {
                    setShowVerifyingOverlay(true);
                    try {
                        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/payments/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ booking_id: bookingId, ...response }),
                        });
                        const result = await r.json();
                        if (result.success) router.push(`/booking/success?booking_id=${bookingId}`);
                        else { setShowVerifyingOverlay(false); toast.error('Payment verification failed.'); }
                    } catch { setShowVerifyingOverlay(false); toast.error('Verification error'); }
                },
                prefill: { name: 'Player' },
                theme: { color: '#00e599' },
                modal: { ondismiss: () => { setShowLoadingRazorpay(false); toast('Payment cancelled.', { icon: '⚠️' }); setBookingInProgress(false); } },
            });
            setShowLoadingRazorpay(false);
            rzp.open();
        } catch (err: any) {
            setShowLoadingRazorpay(false);
            toast.error(err?.response?.data?.detail || 'Failed to create payment order.');
            setBookingInProgress(false);
        }
    };

    // ── Main book handler ─────────────────────────────────────────────────────
    const handleBook = async () => {
        const token = localStorage.getItem('viswa_token');
        if (!token) { toast.error('Please login first'); router.push('/login'); return; }
        if (!selectedSlots.length) { toast.error('Select at least one slot'); return; }
        setBookingInProgress(true);
        try {
            const bookingRes = await createBooking({
                turf_id: Number(id),
                date: selectedDate,
                slot_ids: selectedSlots,
                feature_ids: selectedFeatures,
                with_bowling_machine: filterMachine,
                discount_code: couponData?.code || undefined,
            });
            const booking = bookingRes.data;
            // Always show the payment selection page
            setPendingBookingId(booking.id);
            setShowPaymentModal(true);
            setBookingInProgress(false);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Booking failed.';
            toast.error(msg);
            setBookingInProgress(false);
            // Refresh slots to clear any stale selection (slot IDs may have changed)
            setSelectedSlots([]);
            setSlotsLoading(true);
            try {
                const r = await getTurfSlots(Number(id), selectedDate, token || undefined);
                setSlots(r.data);
            } catch { setSlots([]); }
            finally { setSlotsLoading(false); }
        }
    };


    const handlePaymentSelect = async (type: 'full' | 'advance') => {
        if (!pendingBookingId) return;
        setShowPaymentModal(false);
        setBookingInProgress(true);
        await openRazorpay(pendingBookingId, type);
    };

    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const cardStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 28px',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#000000', color: '#F0F4F8', paddingTop: 100, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>

            {/* ── Full-screen booking lock overlay ─────────────────────────── */}
            {(bookingInProgress || showLoadingRazorpay) && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9000,
                    background: 'rgba(0,0,0,0.82)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 20,
                    pointerEvents: 'all', // blocks ALL clicks underneath
                }}>
                    {/* Spinner */}
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        border: '4px solid rgba(0,229,153,0.15)',
                        borderTopColor: '#00e599',
                        animation: 'spin 0.9s linear infinite',
                    }} />
                    <p style={{
                        color: '#00e599', fontWeight: 700, fontSize: 17,
                        fontFamily: 'Outfit, sans-serif', letterSpacing: '0.02em',
                        margin: 0,
                    }}>
                        {showLoadingRazorpay ? 'Opening Payment…' : 'Processing Booking…'}
                    </p>
                    <p style={{ color: '#4A5568', fontSize: 13, margin: 0 }}>
                        Please wait, do not close this page.
                    </p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: '20%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,153,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 40, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                        🏏{' '}
                        <span style={{ color: '#00e599' }}>
                            Book Your Game
                        </span>
                    </h1>
                    {turf && (
                        <p style={{ color: '#8B9CB0', marginTop: 6 }}>
                            {turf.name} · {FACILITY_LABELS[turf.facility_type] || turf.facility_type}
                        </p>
                    )}
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }} className="booking-grid">
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Date Picker */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📅 Select Date</h3>
                            <CalendarPicker
                                value={selectedDate}
                                min={today}
                                max={maxDate}
                                onChange={setSelectedDate}
                                availableDates={availableDates}
                            />
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {[
                                { label: 'Available', style: SLOT_COLORS.available },
                                { label: 'Selected', style: SLOT_COLORS.selected },
                                { label: 'Held', style: SLOT_COLORS.held },
                                { label: 'Booked', style: SLOT_COLORS.booked },
                            ].map(({ label, style }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, ...style }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* Slots Grid */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🕐 Available Slots</h3>
                                {isNetFacility && (
                                    <button
                                        onClick={() => setFilterMachine(f => !f)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '7px 14px', borderRadius: 20,
                                            border: filterMachine ? '1.5px solid #FFD700' : '1px solid rgba(255,255,255,0.15)',
                                            background: filterMachine ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)',
                                            color: filterMachine ? '#FFD700' : '#8B9CB0',
                                            cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                            fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                            boxShadow: filterMachine ? '0 0 14px rgba(255,215,0,0.18)' : 'none',
                                        }}
                                    >
                                        <span>🤖</span>
                                        <span>With Bowling Machine</span>
                                        <span style={{
                                            width: 36, height: 20, borderRadius: 10,
                                            display: 'inline-flex', alignItems: 'center',
                                            background: filterMachine ? '#FFD700' : 'rgba(255,255,255,0.1)',
                                            padding: '2px', transition: 'background 0.2s',
                                        }}>
                                            <span style={{
                                                width: 16, height: 16, borderRadius: '50%',
                                                background: filterMachine ? '#0a0a0a' : '#4A5568',
                                                transform: filterMachine ? 'translateX(16px)' : 'translateX(0)',
                                                transition: 'transform 0.2s', display: 'block',
                                            }} />
                                        </span>
                                    </button>
                                )}
                            </div>
                            {slotsLoading ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                                    {[...Array(12)].map((_, i) => <div key={i} style={{ height: 72, borderRadius: 10 }} className="shimmer" />)}
                                </div>
                            ) : slots.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#8B9CB0' }}>No slots available for this date</div>
                            ) : (() => {
                                // Hide slots whose end time has already passed when viewing today
                                const nowMins = selectedDate === today
                                    ? new Date().getHours() * 60 + new Date().getMinutes()
                                    : -1;
                                const visibleSlots = slots.filter(slot => {
                                    // Filter out past slots for today
                                    if (nowMins >= 0) {
                                        const [h, m] = slot.end_time.split(':').map(Number);
                                        if (h * 60 + m <= nowMins) return false;
                                    }
                                    // Filter to machine-available only if toggle is on
                                    if (filterMachine && !slot.machine_available) return false;
                                    return true;
                                });
                                return visibleSlots.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#8B9CB0' }}>No more slots available for today</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                                        {visibleSlots.map(slot => {
                                            const isSelected = selectedSlots.includes(slot.id);
                                            const style = getSlotStyle(slot, isSelected);
                                            const isInteractive = slot.status === 'available' || !!slot.held_by_me;
                                            return (
                                                <motion.button key={slot.id}
                                                    whileHover={isInteractive ? { scale: 1.05 } : {}}
                                                    whileTap={isInteractive ? { scale: 0.95 } : {}}
                                                    onClick={() => toggleSlot(slot)}
                                                    title={slot.held_by_me && !isSelected ? 'Your held slot — click to re-select' : undefined}
                                                    style={{ ...style, borderRadius: 10, padding: '12px 4px', textAlign: 'center', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>

                                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{slot.start_time.slice(0, 5)}</div>
                                                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>—</div>
                                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{slot.end_time.slice(0, 5)}</div>
                                                    <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>₹{slot.price}</div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Add-ons */}
                        {features.length > 0 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>✨ Add-ons</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                                    {features.map(feat => {
                                        const selected = selectedFeatures.includes(feat.id);
                                        return (
                                            <motion.button key={feat.id} whileTap={{ scale: 0.97 }}
                                                onClick={() => setSelectedFeatures(p => p.includes(feat.id) ? p.filter(f => f !== feat.id) : [...p, feat.id])}
                                                style={{ padding: '14px 16px', borderRadius: 10, textAlign: 'left', border: selected ? '1px solid #00e599' : '1px solid rgba(255,255,255,0.08)', background: selected ? 'rgba(0,229,153,0.08)' : 'rgba(255,255,255,0.03)', color: selected ? '#00e599' : '#8B9CB0', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{feat.name}</div>
                                                <div style={{ fontSize: 12, marginTop: 4 }}>+₹{feat.extra_price}</div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column — Booking Summary */}
                    <div style={{ position: 'sticky', top: 90 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', border: '1px solid rgba(0,229,153,0.15)', borderRadius: 20, padding: 28, boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset' }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                🛒 Booking Summary
                            </h3>

                            {selectedSlots.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#8B9CB0', fontSize: 14 }}>Select slots to continue</div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                        {[
                                            ['Slots selected', `${selectedSlots.length}`],
                                            ['Date', selectedDate],
                                            ...(filterMachine ? [['Bowling machine', '🤖 Included']] : []),
                                            ...(selectedFeatures.length ? [['Add-ons', `${selectedFeatures.length}`]] : []),
                                        ].map(([label, value]) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                                <span style={{ color: '#8B9CB0' }}>{label}</span>
                                                <span style={{ color: '#F0F4F8', fontWeight: 600 }}>{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginBottom: 20 }}>
                                        {slotTotal > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                                                <span style={{ color: '#8B9CB0' }}>Slots</span><span>₹{slotTotal}</span>
                                            </div>
                                        )}
                                        {filterMachine && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                                                <span style={{ color: '#FFD700' }}>🤖 Bowling Machine</span><span style={{ color: '#FFD700' }}>+₹{machineTotal}</span>
                                            </div>
                                        )}
                                        {featureTotal > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                                                <span style={{ color: '#8B9CB0' }}>Add-ons</span><span>₹{featureTotal}</span>
                                            </div>
                                        )}

                                        {/* Coupon Gallery — shows active coupons for tap-to-apply */}
                                        {!couponData && (
                                            <CouponGallery
                                                selectedSlotCount={selectedSlots.length}
                                                onApply={(code) => {
                                                    setCouponCode(code);
                                                    // auto-apply after setting code
                                                    setTimeout(async () => {
                                                        if (grandTotal === 0) { toast.error('Select slots first'); return; }
                                                        setApplyingCoupon(true);
                                                        try {
                                                            const res = await validateCoupon(code, grandTotal, selectedSlots.length);
                                                            setCouponData(res.data);
                                                            toast.success(res.data.message, { duration: 4000, icon: '🎟️' });
                                                        } catch (err: any) {
                                                            setCouponData(null);
                                                            toast.error(err?.response?.data?.detail || 'Invalid coupon code');
                                                        } finally { setApplyingCoupon(false); }
                                                    }, 0);
                                                }}
                                            />
                                        )}

                                        {/* Coupon input */}
                                        <div style={{ marginTop: 8, marginBottom: 4 }}>
                                            {!couponData ? (
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <input
                                                        value={couponCode}
                                                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                        onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                                        placeholder="Coupon code"
                                                        style={{
                                                            flex: 1, padding: '9px 12px',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            border: '1px solid rgba(255,255,255,0.12)',
                                                            borderRadius: 9, color: '#F0F4F8',
                                                            fontSize: 13, outline: 'none',
                                                            fontFamily: 'Inter, sans-serif',
                                                            letterSpacing: '0.05em',
                                                        }}
                                                    />
                                                    <button
                                                        onClick={handleApplyCoupon}
                                                        disabled={applyingCoupon || !couponCode.trim()}
                                                        style={{
                                                            padding: '9px 14px', borderRadius: 9, border: 'none',
                                                            background: couponCode.trim() ? 'rgba(0,229,153,0.12)' : 'rgba(255,255,255,0.05)',
                                                            color: couponCode.trim() ? '#00e599' : '#4A5568',
                                                            cursor: couponCode.trim() && !applyingCoupon ? 'pointer' : 'not-allowed',
                                                            fontWeight: 700, fontSize: 12,
                                                            fontFamily: 'Inter, sans-serif',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {applyingCoupon ? '⏳' : 'Apply'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '8px 12px', borderRadius: 9,
                                                    background: 'rgba(0,255,136,0.08)',
                                                    border: '1px solid rgba(0,255,136,0.25)',
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#00e599' }}>🎟️ {couponData.code}</span>
                                                        <span style={{ fontSize: 11, color: '#00e599', marginLeft: 8, opacity: 0.8 }}>−₹{couponData.discount_amount}</span>
                                                    </div>
                                                    <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#4A5568', cursor: 'pointer', fontSize: 16, lineHeight: 1 }} title="Remove coupon">✕</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Discount row */}
                                        {couponData && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                                                <span style={{ color: '#00e599' }}>🏷️ Discount</span>
                                                <span style={{ color: '#00e599', fontWeight: 700 }}>−₹{couponData.discount_amount}</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 8 }}>
                                            <span>Total</span>
                                            <div style={{ textAlign: 'right' }}>
                                                {couponData && (
                                                    <div style={{ fontSize: 13, color: '#4A5568', textDecoration: 'line-through', lineHeight: 1 }}>₹{grandTotal}</div>
                                                )}
                                                <span style={{ color: '#00e599' }}>₹{couponData ? finalTotal : grandTotal}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Show advance hint if applicable */}
                                    {advanceAmount && advanceAmount < grandTotal && (
                                        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', fontSize: 12, color: '#8B9CB0', textAlign: 'center' }}>
                                            ⚡ Advance payment option available: <strong style={{ color: '#FFD700' }}>₹{advanceAmount}</strong>
                                        </div>
                                    )}
                                </>
                            )}

                            {holdSecondsLeft !== null && holdSecondsLeft > 0 && (
                                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: holdSecondsLeft < 120 ? 'rgba(255,68,68,0.1)' : 'rgba(255,215,0,0.08)', border: `1px solid ${holdSecondsLeft < 120 ? 'rgba(255,68,68,0.4)' : 'rgba(255,215,0,0.3)'}`, textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: holdSecondsLeft < 120 ? '#FF4444' : '#FFD700', fontWeight: 700 }}>
                                        ⏱ Hold expires in{' '}
                                        <span style={{ fontSize: 16 }}>
                                            {String(Math.floor(holdSecondsLeft / 60)).padStart(2, '0')}:{String(holdSecondsLeft % 60).padStart(2, '0')}
                                        </span>
                                    </div>
                                    {holdSecondsLeft < 120 && <div style={{ fontSize: 10, color: '#FF4444', marginTop: 3 }}>Complete payment before time runs out!</div>}
                                </div>
                            )}
                            {holdSecondsLeft === 0 && (
                                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.4)', textAlign: 'center' }}>
                                    <div style={{ fontSize: 12, color: '#FF4444', fontWeight: 700 }}>⚠️ Hold expired — reload slots</div>
                                </div>
                            )}

                            <button onClick={handleBook} disabled={selectedSlots.length === 0 || bookingInProgress}
                                style={{
                                    width: '100%',
                                    background: selectedSlots.length === 0 || bookingInProgress
                                        ? 'rgba(0,229,153,0.15)'
                                        : '#00e599',
                                    color: selectedSlots.length === 0 || bookingInProgress ? 'rgba(0,229,153,0.4)' : '#000000',
                                    fontWeight: 800, padding: '18px 24px', border: 'none', borderRadius: 14, fontSize: 18,
                                    cursor: selectedSlots.length === 0 || bookingInProgress ? 'not-allowed' : 'pointer',
                                    fontFamily: 'Outfit, sans-serif',
                                    letterSpacing: '2px',
                                    boxShadow: selectedSlots.length > 0 && !bookingInProgress ? '0 0 28px rgba(0,229,153,0.4)' : 'none',
                                    transition: 'all 0.2s',
                                }}>
                                {bookingInProgress ? '⏳ Processing…' : selectedSlots.length === 0 ? 'SELECT SLOTS' : 'PAY →'}
                            </button>
                            <p style={{ color: '#8B9CB0', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
                                Slots are held for <strong>10 min</strong> — pay before time runs out.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Selection Modal */}
            <AnimatePresence>
                {showPaymentModal && pendingBookingId && (
                    <PaymentSelectionModal
                        totalPrice={couponData ? finalTotal : grandTotal}
                        advanceAmount={advanceAmount}
                        onClose={() => { setShowPaymentModal(false); setBookingInProgress(false); }}
                        onSelect={handlePaymentSelect}
                    />
                )}
            </AnimatePresence>

            {/* ── Verifying Overlay ────────────────────────────────────────── */}
            <AnimatePresence>
                {showVerifyingOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 99999,
                            backdropFilter: 'blur(18px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(18px) saturate(180%)',
                            background: 'rgba(0,0,0,0.75)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 0.1 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}
                        >
                            {/* Spinner rings */}
                            <div style={{ position: 'relative', width: 96, height: 96 }}>
                                <motion.div
                                    animate={{ scale: [1, 1.18, 1], opacity: [0.15, 0.4, 0.15] }}
                                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: 'rgba(0,229,153,0.18)' }}
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.25, 0.55, 0.25] }}
                                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                                    style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '1.5px solid rgba(0,229,153,0.35)' }}
                                />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#00e599', borderRightColor: 'rgba(0,229,153,0.35)' }}
                                />
                                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,229,153,0.08)', border: '1px solid rgba(0,229,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                                    💳
                                </div>
                            </div>
                            {/* Text */}
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#F0F4F8', letterSpacing: '-0.3px', marginBottom: 8 }}>
                                    Confirming your booking
                                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>…</motion.span>
                                </div>
                                <div style={{ fontSize: 13, color: '#8B9CB0', fontFamily: 'Inter, sans-serif' }}>
                                    Please wait — verifying payment with our servers
                                </div>
                            </div>
                            {/* Shimmer progress bar */}
                            <div style={{ width: 200, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                <motion.div
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ width: '60%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, transparent, #00e599, transparent)' }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Razorpay Loading Overlay ─────────────────────────────────── */}
            <AnimatePresence>
                {showLoadingRazorpay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 99999,
                            backdropFilter: 'blur(18px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(18px) saturate(180%)',
                            background: 'rgba(0,0,0,0.78)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.82, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 0.08 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}
                        >
                            <div style={{ position: 'relative', width: 96, height: 96 }}>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.35, 0.12] }}
                                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ position: 'absolute', inset: -14, borderRadius: '50%', background: 'rgba(0,229,153,0.15)' }}
                                />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#00e599', borderRightColor: 'rgba(0,229,153,0.3)' }}
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                                    style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px dashed rgba(0,229,153,0.2)' }}
                                />
                                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,229,153,0.07)', border: '1px solid rgba(0,229,153,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                                    🔒
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#F0F4F8', letterSpacing: '-0.3px', marginBottom: 8 }}>
                                    Preparing secure payment
                                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>…</motion.span>
                                </div>
                                <div style={{ fontSize: 13, color: '#8B9CB0', fontFamily: 'Inter, sans-serif' }}>
                                    Loading payment gateway — please don&apos;t navigate away
                                </div>
                            </div>
                            <div style={{ width: 200, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                <motion.div
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ width: '60%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, transparent, #00e599, transparent)' }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
        @media (max-width: 768px) {
          .booking-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </div>
    );
}
