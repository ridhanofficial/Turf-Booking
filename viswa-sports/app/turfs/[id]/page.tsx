'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTurf } from '@/lib/api';

const FACILITY_EMOJIS: Record<string, string> = {
    full_pitch: '🏏',
    net_normal: '🥅',
    net_cement: '🥅',
};
const FACILITY_LABELS: Record<string, string> = {
    full_pitch: 'Full Turf Pitch',
    net_normal: 'Net — Normal Surface',
    net_cement: 'Net — Cement Surface',
};

export default function TurfDetailPage() {
    const { id } = useParams();
    const [turf, setTurf] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getTurf(Number(id))
            .then((res) => setTurf(res.data))
            .catch(() => setTurf(null))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#000000', paddingTop: 100 }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ height: 320, borderRadius: 20, background: 'rgba(255,255,255,0.04)' }} className="shimmer" />
                </div>
            </div>
        );
    }

    if (!turf) {
        return (
            <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🏟️</div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>Turf not found</h2>
                    <Link href="/turfs" style={{ color: '#00e599', textDecoration: 'none' }}>← Back to turfs</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#000000', color: '#F0F4F8', paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            {/* Hero Banner */}
            {(() => {
                const imgUrl = turf.image_urls?.[0];
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                return (
                    <div style={{
                        height: 340,
                        background: imgUrl
                            ? `url(${apiBase}${imgUrl}) center/cover no-repeat`
                            : 'rgba(255,255,255,0.03)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', overflow: 'hidden',
                        fontSize: imgUrl ? 0 : 120,
                        marginTop: 64,
                    }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.3), #0a0a0a)' }} />
                        {!imgUrl && (FACILITY_EMOJIS[turf.facility_type] || '🏏')}
                        <div style={{
                            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(0,229,153,0.12)', border: '1px solid rgba(0,229,153,0.25)',
                            borderRadius: 8, padding: '5px 14px',
                            color: '#00e599', fontSize: 12, fontWeight: 700, letterSpacing: '1px',
                        }}>
                            {FACILITY_EMOJIS[turf.facility_type]} {FACILITY_LABELS[turf.facility_type] || turf.facility_type}
                        </div>
                    </div>
                );
            })()}

            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40 }}
                    className="turf-detail-grid">
                    {/* Left */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 style={{ fontSize: 40, fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 16 }}>
                            {turf.name}
                        </h1>
                        <p style={{ color: '#8B9CB0', fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
                            {turf.description || 'A premium sports facility designed for champions. Experience world-class playing conditions with top-notch amenities.'}
                        </p>

                        {/* Hours */}
                        <div style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16, padding: '24px 28px', marginBottom: 24,
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                🕐 Operating Hours
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#00e599', fontFamily: 'Outfit, sans-serif' }}>
                                        {turf.operating_start_time}
                                    </div>
                                    <div style={{ color: '#8B9CB0', fontSize: 12, marginTop: 4 }}>Opens</div>
                                </div>
                                <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.08)' }} />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#00e599', fontFamily: 'Outfit, sans-serif' }}>
                                        {turf.operating_end_time}
                                    </div>
                                    <div style={{ color: '#8B9CB0', fontSize: 12, marginTop: 4 }}>Closes</div>
                                </div>
                            </div>
                            {turf.slot_duration_minutes && (
                                <div style={{ marginTop: 16, color: '#8B9CB0', fontSize: 14 }}>
                                    Slot duration:{' '}
                                    <span style={{ color: '#F0F4F8', fontWeight: 600 }}>{turf.slot_duration_minutes} minutes</span>
                                </div>
                            )}
                        </div>

                        {/* Amenities */}
                        {turf.amenities && turf.amenities.length > 0 && (
                            <div style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 16, padding: '24px 28px',
                            }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>✅ Amenities</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                                    {turf.amenities.map((a: string) => (
                                        <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8B9CB0', fontSize: 14 }}>
                                            <span style={{ color: '#00e599' }}>✓</span> {a}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Right — Sticky Booking Card */}
                    <div style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                border: '1px solid rgba(0,229,153,0.18)',
                                borderRadius: 20, padding: 32,
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{
                                    fontSize: 48, fontWeight: 900, fontFamily: 'Outfit, sans-serif',
                                    color: '#00e599',
                                }}>
                                    ₹{turf.base_price}
                                </div>
                                <div style={{ color: '#8B9CB0', fontSize: 14, marginTop: 4 }}>per slot</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                                {[
                                    ['Facility', FACILITY_LABELS[turf.facility_type] || turf.facility_type],
                                    ['Duration', `${turf.slot_duration_minutes || 60} min/slot`],
                                    ['Hours', `${turf.operating_start_time} – ${turf.operating_end_time}`],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#8B9CB0' }}>{label}</span>
                                        <span style={{ color: '#F0F4F8', fontWeight: 600, textTransform: 'capitalize' }}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            <Link href={`/turfs/${turf.id}/book`} style={{
                                display: 'block', textAlign: 'center',
                                background: '#00e599',
                                color: '#000000', fontWeight: 800, padding: '16px 24px',
                                borderRadius: 14, textDecoration: 'none', fontSize: 17,
                                boxShadow: '0 0 28px rgba(0,229,153,0.35)',
                            }}>
                                🎬 Book a Game
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @media (max-width: 768px) {
          .turf-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
