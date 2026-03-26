'use client';
import { useEffect, useState } from 'react';
import { getActiveCoupons } from '@/lib/api';

interface Coupon {
    id: number;
    code: string;
    type: 'flat' | 'percent';
    value: number;
    valid_from: string;
    valid_to: string;
    min_slots?: number | null;
}

interface CouponGalleryProps {
    /** Called when user taps a coupon card to apply it */
    onApply: (code: string) => void;
    /** The currently selected slot count — used to show eligibility */
    selectedSlotCount?: number;
}

export default function CouponGallery({ onApply, selectedSlotCount = 0 }: CouponGalleryProps) {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getActiveCoupons()
            .then(r => setCoupons(r.data))
            .catch(() => setCoupons([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return null;
    if (coupons.length === 0) return null;

    return (
        <div style={{ marginBottom: 24 }}>
            <p style={{ color: '#8B9CB0', fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🏷️ Available Coupons
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {coupons.map(c => {
                    const eligible = !c.min_slots || selectedSlotCount >= c.min_slots;
                    return (
                        <button
                            key={c.id}
                            onClick={() => eligible && onApply(c.code)}
                            title={eligible ? `Click to apply ${c.code}` : `Book ${c.min_slots} slots to unlock`}
                            style={{
                                position: 'relative',
                                background: eligible
                                    ? 'rgba(0,229,153,0.06)'
                                    : 'rgba(255,255,255,0.03)',
                                border: eligible
                                    ? '1px dashed rgba(0,229,153,0.4)'
                                    : '1px dashed rgba(255,255,255,0.12)',
                                borderRadius: 12,
                                padding: '10px 14px',
                                cursor: eligible ? 'pointer' : 'not-allowed',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                minWidth: 140,
                                opacity: eligible ? 1 : 0.55,
                            }}
                            onMouseEnter={e => {
                                if (eligible) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,153,0.11)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = eligible
                                    ? 'rgba(0,229,153,0.06)'
                                    : 'rgba(255,255,255,0.03)';
                            }}
                        >
                            {/* Coupon code */}
                            <div style={{
                                fontFamily: 'monospace', fontWeight: 800,
                                fontSize: 14, letterSpacing: 1,
                                color: eligible ? '#00e599' : '#6B7A8D',
                                marginBottom: 4,
                            }}>
                                {c.code}
                            </div>

                            {/* Discount value */}
                            <div style={{ color: '#F0F4F8', fontSize: 12, fontWeight: 700 }}>
                                {c.type === 'percent' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                            </div>

                            {/* Min slots badge */}
                            {c.min_slots && (
                                <div style={{
                                    marginTop: 6,
                                    fontSize: 10, fontWeight: 700,
                                    color: eligible ? '#FFD700' : '#6B7A8D',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    {eligible ? '✓' : '🔒'} Min {c.min_slots} slot{c.min_slots > 1 ? 's' : ''}
                                </div>
                            )}

                            {/* Valid till */}
                            <div style={{ color: '#6B7A8D', fontSize: 10, marginTop: 4 }}>
                                Till {new Date(c.valid_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>

                            {/* Tap-to-apply chip */}
                            {eligible && (
                                <div style={{
                                    position: 'absolute', top: 6, right: 8,
                                    fontSize: 9, fontWeight: 700,
                                    color: 'rgba(0,229,153,0.6)', letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}>
                                    Tap to apply
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
