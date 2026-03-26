'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getMyBookings, cancelBooking } from '@/lib/api';

interface MyBooking {
    id: number;
    turf_id: number;
    turf_name: string;
    date: string;
    total_price: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    razorpay_order_id: string | null;
    razorpay_payment_id?: string | null;
    created_at: string;
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
    confirmed: {
        background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.35)',
        color: '#00FF88', borderRadius: 8, padding: '3px 12px', fontSize: 12, fontWeight: 700,
    },
    pending: {
        background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.35)',
        color: '#FFD700', borderRadius: 8, padding: '3px 12px', fontSize: 12, fontWeight: 700,
    },
    cancelled: {
        background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.35)',
        color: '#FF4444', borderRadius: 8, padding: '3px 12px', fontSize: 12, fontWeight: 700,
    },
};

function CancelModal({
    booking,
    onClose,
    onConfirm,
    loading,
}: {
    booking: MyBooking;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
}) {
    const isPaid = !!booking.razorpay_payment_id;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#131920', border: '1px solid rgba(255,68,68,0.25)',
                    borderRadius: 20, padding: '36px 32px', maxWidth: 440, width: '100%',
                }}
            >
                <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8, fontFamily: 'Outfit, sans-serif', color: '#F0F4F8' }}>
                    Cancel Booking?
                </h2>
                <p style={{ color: '#8B9CB0', fontSize: 14, textAlign: 'center', lineHeight: 1.7, marginBottom: 20 }}>
                    <strong style={{ color: '#F0F4F8' }}>{booking.turf_name}</strong> on{' '}
                    {new Date(booking.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                {isPaid && (
                    <div style={{
                        background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)',
                        borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#8B9CB0',
                    }}>
                        💰 A refund of <strong style={{ color: '#00FF88' }}>₹{Number(booking.total_price).toLocaleString('en-IN')}</strong> will be initiated automatically in 3–5 business days.
                    </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} disabled={loading} style={{
                        flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#F0F4F8', fontWeight: 600, padding: '13px', borderRadius: 10, cursor: 'pointer',
                        fontSize: 14, fontFamily: 'Outfit, sans-serif',
                    }}>
                        Keep Booking
                    </button>
                    <button onClick={onConfirm} disabled={loading} style={{
                        flex: 1, background: loading ? 'rgba(255,68,68,0.3)' : 'rgba(255,68,68,0.15)',
                        border: '1px solid rgba(255,68,68,0.4)',
                        color: '#FF6B6B', fontWeight: 700, padding: '13px', borderRadius: 10,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 14, fontFamily: 'Outfit, sans-serif',
                        transition: 'all 0.2s',
                    }}>
                        {loading ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

const PAGE_SIZE = 10;

export default function MyBookingsPage() {
    const router = useRouter();
    const [bookings, setBookings] = useState<MyBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const skipRef = useRef(0);
    const [cancelTarget, setCancelTarget] = useState<MyBooking | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    const fetchBookings = useCallback(async (reset = false) => {
        const currentSkip = reset ? 0 : skipRef.current;
        if (reset) { setLoading(true); skipRef.current = 0; } else setLoadingMore(true);
        try {
            const res = await getMyBookings(currentSkip, PAGE_SIZE);
            const newItems: MyBooking[] = res.data;
            setBookings(prev => reset ? newItems : [...prev, ...newItems]);
            setHasMore(newItems.length === PAGE_SIZE);
            skipRef.current = currentSkip + newItems.length;
        } catch {
            setBookings([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('viswa_token');
        if (!token) { router.push('/login'); return; }
        fetchBookings(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        setCancelLoading(true);
        try {
            const res = await cancelBooking(cancelTarget.id);
            toast.success(res.data.message || 'Booking cancelled');
            setCancelTarget(null);
            fetchBookings(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to cancel booking');
        } finally {
            setCancelLoading(false);
        }
    };

    const canCancel = (b: MyBooking) => {
        if (b.status === 'cancelled') return false;
        if (b.status === 'pending') return true;
        // confirmed: check 2-hour cutoff (conservative client-side estimate — server enforces exact time)
        const bookingTime = new Date(b.date + 'T00:00:00Z');
        const cutoff = new Date(bookingTime.getTime() - 2 * 60 * 60 * 1000);
        return new Date() < cutoff;
    };


    return (
        <div style={{ minHeight: '100vh', background: '#000000', color: '#F0F4F8', paddingTop: 100, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,153,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
                    <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 8 }}>
                        My{' '}
                        <span style={{ color: '#00e599' }}>
                            Bookings
                        </span>
                    </h1>
                    <p style={{ color: '#8B9CB0', fontSize: 16 }}>Your complete booking history</p>
                </motion.div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ height: 100, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
                        ))}
                    </div>
                ) : bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🏟️</div>
                        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No bookings yet</h3>
                        <p style={{ color: '#8B9CB0', marginBottom: 28 }}>Book a turf and your matches will appear here.</p>
                        <Link href="/turfs" style={{
                            background: '#00e599',
                            color: '#000000', fontWeight: 800, padding: '14px 32px',
                            borderRadius: 12, textDecoration: 'none', fontSize: 15,
                            boxShadow: '0 0 20px rgba(0,229,153,0.3)',
                        }}>
                            Browse Turfs →
                        </Link>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {bookings.map((booking, i) => (
                                <motion.div
                                    key={booking.id}
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        backdropFilter: 'blur(16px) saturate(180%)',
                                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                        border: booking.status === 'cancelled' ? '1px solid rgba(255,68,68,0.08)' : '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: 18, padding: '24px 28px',
                                        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.4)',
                                        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
                                        opacity: booking.status === 'cancelled' ? 0.7 : 1,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { if (booking.status !== 'cancelled') (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,153,0.2)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = booking.status === 'cancelled' ? 'rgba(255,68,68,0.08)' : 'rgba(255,255,255,0.08)'; }}
                                >
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                                        background: 'rgba(0,229,153,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                                    }}>
                                        🏟️
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                                                {booking.turf_name}
                                            </span>
                                            <span style={STATUS_STYLES[booking.status]}>
                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                            </span>
                                        </div>
                                        <div style={{ color: '#8B9CB0', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span>📅 {new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <span>🎟️ #{booking.id}</span>
                                            <span>🗓️ Booked {new Date(booking.created_at).toLocaleDateString('en-IN')}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: '#00e599', fontFamily: 'Outfit, sans-serif' }}>
                                            ₹{Number(booking.total_price).toLocaleString('en-IN')}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {booking.status === 'pending' && (
                                                <Link href={`/turfs/${booking.turf_id}/book`} style={{
                                                    fontSize: 12, color: '#FFD700', textDecoration: 'none',
                                                    background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)',
                                                    padding: '5px 12px', borderRadius: 8, fontWeight: 600,
                                                }}>
                                                    Pay Now
                                                </Link>
                                            )}
                                            {canCancel(booking) && (
                                                <button
                                                    onClick={() => setCancelTarget(booking)}
                                                    style={{
                                                        fontSize: 12, color: '#FF6B6B', background: 'rgba(255,68,68,0.08)',
                                                        border: '1px solid rgba(255,68,68,0.2)', padding: '5px 12px',
                                                        borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Load More */}
                        {hasMore && (
                            <div style={{ textAlign: 'center', marginTop: 32 }}>
                                <button
                                    onClick={() => fetchBookings(false)}
                                    disabled={loadingMore}
                                    style={{
                                        background: 'rgba(0,229,153,0.08)', border: '1px solid rgba(0,229,153,0.2)',
                                        color: '#00e599', padding: '12px 32px', borderRadius: 12,
                                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                                        fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                                        opacity: loadingMore ? 0.6 : 1,
                                    }}
                                >
                                    {loadingMore ? '⏳ Loading…' : '⬇ Load More Bookings'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Cancel Confirmation Modal */}
            <AnimatePresence>
                {cancelTarget && (
                    <CancelModal
                        booking={cancelTarget}
                        onClose={() => !cancelLoading && setCancelTarget(null)}
                        onConfirm={handleCancelConfirm}
                        loading={cancelLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
