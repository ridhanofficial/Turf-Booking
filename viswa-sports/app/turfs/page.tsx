'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getTurfs } from '@/lib/api';

const FACILITY_TYPES = ['all', 'full_pitch', 'net_normal', 'net_cement'];
const FACILITY_EMOJIS: Record<string, string> = {
    all: '🏅',
    full_pitch: '🏏',
    net_normal: '🥅',
    net_cement: '🥅',
};
const FACILITY_LABELS: Record<string, string> = {
    all: 'All',
    full_pitch: 'Full Turf Pitch',
    net_normal: 'Net — Normal Surface',
    net_cement: 'Net — Cement Surface',
};

interface Turf {
    id: number;
    name: string;
    facility_type: string;
    description: string;
    base_price: number;
    operating_start_time: string;
    operating_end_time: string;
    status: string;
    image_urls?: string[];
}

function TurfsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [turfs, setTurfs] = useState<Turf[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFacility, setSelectedFacility] = useState(searchParams.get('facility') || 'all');

    useEffect(() => {
        setLoading(true);
        getTurfs(selectedFacility !== 'all' ? selectedFacility : undefined)
            .then((r) => setTurfs(r.data))
            .catch(() => setTurfs([]))
            .finally(() => setLoading(false));
    }, [selectedFacility]);

    return (
        <>
            {/* Facility Type Filter */}
            <div className="filter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 40, alignItems: 'center' }}>
                <span style={{ color: '#8B9CB0', fontSize: 13, marginRight: 4 }}>Facility:</span>
                {FACILITY_TYPES.map((fac) => (
                    <button
                        key={fac}
                        onClick={() => setSelectedFacility(fac)}
                        style={{
                            padding: '7px 18px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            background: selectedFacility === fac ? '#00e599' : 'rgba(255,255,255,0.04)',
                            backdropFilter: selectedFacility !== fac ? 'blur(12px)' : 'none',
                            borderColor: selectedFacility === fac ? '#00e599' : 'rgba(255,255,255,0.08)',
                            color: selectedFacility === fac ? '#000000' : '#8B9CB0',
                            boxShadow: selectedFacility === fac ? '0 0 14px rgba(0,229,153,0.3)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        {FACILITY_EMOJIS[fac]} {FACILITY_LABELS[fac]}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} style={{ height: 280, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} className="shimmer" />
                    ))}
                </div>
            ) : turfs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🏟️</div>
                    <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No turfs found</h3>
                    <p style={{ color: '#8B9CB0' }}>Try a different sport filter</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                    {turfs.map((turf, i) => (
                        <motion.div
                            key={turf.id}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            whileHover={{ y: -6 }}
                        >
                            <div onClick={() => router.push(`/turfs/${turf.id}`)} style={{ cursor: 'pointer', textDecoration: 'none' }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    backdropFilter: 'blur(16px) saturate(180%)',
                                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)',
                                    transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,153,0.3)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 28px rgba(0,229,153,0.1)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)'; }}>
                                    {/* Image area */}
                                    {(() => {
                                        const imgUrl = turf.image_urls?.[0];
                                        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                        return (
                                            <div style={{
                                                height: 180,
                                                background: imgUrl
                                                    ? `url(${apiBase}${imgUrl}) center/cover no-repeat`
                                                    : 'rgba(255,255,255,0.03)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                position: 'relative', fontSize: 72,
                                            }}>
                                                {!imgUrl && (FACILITY_EMOJIS[turf.facility_type] || '🏏')}
                                                <div style={{
                                                    position: 'absolute', top: 12, right: 12,
                                                    background: 'rgba(0,229,153,0.12)', border: '1px solid rgba(0,229,153,0.25)',
                                                    borderRadius: 8, padding: '4px 10px',
                                                    fontSize: 11, fontWeight: 700, color: '#00e599', letterSpacing: '0.5px',
                                                }}>
                                                    {FACILITY_LABELS[turf.facility_type] || turf.facility_type}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Content */}
                                    <div style={{ padding: '20px 24px 24px' }}>
                                        <h3 style={{
                                            fontSize: 18, fontWeight: 700, marginBottom: 8,
                                            fontFamily: 'Outfit, sans-serif', color: '#F0F4F8',
                                        }}>
                                            {turf.name}
                                        </h3>
                                        <p style={{
                                            color: '#8B9CB0', fontSize: 14, lineHeight: 1.6, marginBottom: 16,
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>
                                            {turf.description || 'Premium sports facility with top-notch amenities.'}
                                        </p>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <div>
                                                <div style={{ color: '#8B9CB0', fontSize: 12, marginBottom: 4 }}>
                                                    🕐 {turf.operating_start_time} – {turf.operating_end_time}
                                                </div>
                                                <div style={{ color: '#00e599', fontSize: 22, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                                                    ₹{turf.base_price}
                                                    <span style={{ color: '#8B9CB0', fontSize: 13, fontWeight: 400 }}>/slot</span>
                                                </div>
                                            </div>
                                            <Link href={`/turfs/${turf.id}/book`} style={{
                                                display: 'block', textAlign: 'center',
                                                background: '#00e599', color: '#000000', fontWeight: 700,
                                                padding: '12px', borderRadius: 10, textDecoration: 'none', fontSize: 14,
                                                boxShadow: '0 0 18px rgba(0,229,153,0.3)',
                                            }}>
                                                Book →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </>
    );
}

export default function TurfsPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#000000', paddingTop: 100, paddingBottom: 80, color: '#F0F4F8', position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,153,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
                    <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 8 }}>
                        Our{' '}
                        <span style={{ color: '#00e599' }}>Turfs</span>
                    </h1>
                    <p style={{ color: '#8B9CB0', fontSize: 17 }}>Premium facilities. Real-time availability.</p>
                </motion.div>

                <Suspense fallback={
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} style={{ height: 280, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
                        ))}
                    </div>
                }>
                    <TurfsContent />
                </Suspense>
            </div>
        </div>
    );
}
