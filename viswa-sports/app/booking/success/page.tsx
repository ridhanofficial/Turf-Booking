'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getMyBookings } from '@/lib/api';

function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('booking_id');
    const [booking, setBooking] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('viswa_token');
        if (!token) { router.push('/login'); return; }
        if (!bookingId) return;

        getMyBookings().then(res => {
            const found = res.data.find((b: any) => String(b.id) === bookingId);
            setBooking(found || null);
        }).catch(() => { });
    }, [bookingId, router]);

    return (
        <div style={{ minHeight: '100vh', background: '#000000', color: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px', position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,153,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 520, width: '100%' }}
            >
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(0,229,153,0.15)',
                    borderRadius: 28, padding: 'clamp(28px, 8vw, 56px) clamp(18px, 6vw, 40px)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,229,153,0.06)',
                }}>
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 14 }}
                        style={{
                            width: 88, height: 88, borderRadius: '50%', margin: '0 auto 32px',
                            background: '#00e599',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 40,
                            color: '#0a0a0a', fontWeight: 900,
                        }}
                    >
                        ✓
                    </motion.div>

                    <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>
                        Booking{' '}
                        <span style={{ color: '#00e599' }}>
                            Confirmed!
                        </span>
                    </h1>
                    <p style={{ color: '#8B9CB0', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
                        Your payment was successful. Get ready to play! 🎉
                    </p>

                    {booking && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            style={{
                                background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)',
                                borderRadius: 16, padding: '20px 24px', marginBottom: 32, textAlign: 'left',
                            }}
                        >
                            {[
                                ['Turf', booking.turf_name],
                                ['Date', new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })],
                                ['Booking ID', `#${booking.id}`],
                                ['Amount Paid', `₹${Number(booking.total_price).toLocaleString('en-IN')}`],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 10 }}>
                                    <span style={{ color: '#8B9CB0' }}>{label}</span>
                                    <span style={{ color: '#F0F4F8', fontWeight: 600 }}>{value}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                        <button
                            onClick={() => router.push('/bookings')}
                            style={{
                                background: '#00e599',
                                color: '#0a0a0a', fontWeight: 800, padding: '14px 28px',
                                borderRadius: 12, border: 'none', fontSize: 15,
                                textAlign: 'center', display: 'block', width: '100%',
                                cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                            }}
                        >
                            View My Bookings
                        </button>
                        <button
                            onClick={() => router.push('/turfs')}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#F0F4F8', fontWeight: 600, padding: '14px 28px',
                                borderRadius: 12, fontSize: 15,
                                textAlign: 'center', display: 'block', width: '100%',
                                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            Book Another
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function BookingSuccessPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F0F4F8' }}>
                <div style={{ fontSize: 48 }}>✓</div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
