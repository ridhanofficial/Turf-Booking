'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, cardStyle, btnNeon, FACILITY_LABELS, FACILITY_EMOJIS, Turf } from './admin-styles';
import { adminGetTurfDeleteSummary } from '@/lib/api';

interface DeleteSummary {
    turf_id: number;
    turf_name: string;
    confirmed_bookings: number;
    confirmed_revenue: number;
    pending_bookings: number;
}

interface TurfsTabProps {
    turfs: Turf[];
    onRefresh: () => void;
    onCreateTurf: () => void;
    onEditTurf: (turf: Turf) => void;
    onToggleStatus: (turf: Turf) => void;
    onDeleteTurf: (turf: Turf) => void;
}

export default function TurfsTab({ turfs, onRefresh, onCreateTurf, onEditTurf, onToggleStatus, onDeleteTurf }: TurfsTabProps) {
    const [deletingTurf, setDeletingTurf] = useState<Turf | null>(null);
    const [summary, setSummary] = useState<DeleteSummary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const openDeleteModal = async (turf: Turf) => {
        setDeletingTurf(turf);
        setSummary(null);
        setConfirmText('');
        setLoadingSummary(true);
        try {
            const res = await adminGetTurfDeleteSummary(turf.id);
            setSummary(res.data);
        } catch {
            setSummary({ turf_id: turf.id, turf_name: turf.name, confirmed_bookings: 0, confirmed_revenue: 0, pending_bookings: 0 });
        } finally {
            setLoadingSummary(false);
        }
    };

    const closeModal = () => {
        if (deleting) return;
        setDeletingTurf(null);
        setSummary(null);
        setConfirmText('');
    };

    const handleConfirmDelete = async () => {
        if (!deletingTurf) return;
        setDeleting(true);
        try {
            await onDeleteTurf(deletingTurf);
            closeModal();
        } finally {
            setDeleting(false);
        }
    };

    const nameMatches = confirmText.trim().toLowerCase() === deletingTurf?.name.trim().toLowerCase();
    const hasRisk = summary && (summary.confirmed_bookings > 0 || summary.pending_bookings > 0);

    return (
        <>
            {/* ── Delete Confirmation Modal ── */}
            <AnimatePresence>
                {deletingTurf && (
                    <motion.div
                        key="delete-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 1000,
                            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#0E1419',
                                border: '1px solid rgba(255,68,68,0.35)',
                                borderRadius: 16,
                                padding: 32,
                                maxWidth: 480,
                                width: '100%',
                                boxShadow: '0 0 60px rgba(255,68,68,0.15)',
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: 'rgba(255,68,68,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 24, flexShrink: 0,
                                }}>⚠️</div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 18, fontFamily: 'Outfit, sans-serif', color: '#FF6B6B' }}>
                                        Permanently Delete Turf
                                    </div>
                                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                                        This action <strong style={{ color: '#FF8080' }}>cannot be undone</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Loading state */}
                            {loadingSummary && (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 14 }}>
                                    Checking booking data…
                                </div>
                            )}

                            {/* Summary */}
                            {summary && !loadingSummary && (
                                <>
                                    {/* Warning box — shown only if there's something at risk */}
                                    {hasRisk ? (
                                        <div style={{
                                            background: 'rgba(255,68,68,0.07)',
                                            border: '1px solid rgba(255,68,68,0.25)',
                                            borderRadius: 10,
                                            padding: '16px 18px',
                                            marginBottom: 20,
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#FF6B6B', marginBottom: 10 }}>
                                                🚨 Impact of deleting &quot;{summary.turf_name}&quot;
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {summary.confirmed_bookings > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                        <span style={{ color: '#FF8080' }}>✗ Confirmed (paid) bookings</span>
                                                        <span style={{ fontWeight: 700, color: '#FF6B6B' }}>
                                                            {summary.confirmed_bookings} booking{summary.confirmed_bookings !== 1 ? 's' : ''} · ₹{summary.confirmed_revenue.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                )}
                                                {summary.pending_bookings > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                        <span style={{ color: C.muted }}>✗ Pending (unpaid) bookings</span>
                                                        <span style={{ fontWeight: 700, color: C.muted }}>{summary.pending_bookings} booking{summary.pending_bookings !== 1 ? 's' : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {summary.confirmed_bookings > 0 && (
                                                <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,68,68,0.1)', borderRadius: 7, fontSize: 12, color: '#FF8080', lineHeight: 1.5 }}>
                                                    ⚠️ Confirmed bookings will be <strong>permanently cancelled</strong>. You must process any refunds manually — they will NOT be issued automatically.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{
                                            background: 'rgba(0,255,136,0.06)',
                                            border: '1px solid rgba(0,255,136,0.15)',
                                            borderRadius: 10,
                                            padding: '14px 18px',
                                            marginBottom: 20,
                                            fontSize: 13,
                                            color: 'rgba(0,255,136,0.8)',
                                        }}>
                                            ✓ No active bookings — safe to delete
                                        </div>
                                    )}

                                    {/* Turf name confirm input */}
                                    <div style={{ marginBottom: 20 }}>
                                        <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                                            Type the turf name <strong style={{ color: C.white }}>"{deletingTurf.name}"</strong> to confirm:
                                        </div>
                                        <input
                                            autoFocus
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder={deletingTurf.name}
                                            onKeyDown={(e) => e.key === 'Enter' && nameMatches && !deleting && handleConfirmDelete()}
                                            style={{
                                                width: '100%', padding: '10px 14px',
                                                background: '#0a0a0a',
                                                border: `1px solid ${nameMatches ? 'rgba(255,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                                borderRadius: 8, color: C.white,
                                                fontSize: 14, fontFamily: 'Inter, sans-serif',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                transition: 'border-color 0.2s',
                                            }}
                                        />
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            onClick={closeModal}
                                            disabled={deleting}
                                            style={{
                                                flex: 1, padding: '11px 0', borderRadius: 9,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: C.muted, cursor: 'pointer',
                                                fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14,
                                            }}>
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmDelete}
                                            disabled={!nameMatches || deleting}
                                            style={{
                                                flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
                                                background: nameMatches && !deleting ? 'linear-gradient(135deg,#CC0000,#990000)' : 'rgba(255,68,68,0.15)',
                                                color: nameMatches && !deleting ? '#fff' : 'rgba(255,100,100,0.4)',
                                                cursor: nameMatches && !deleting ? 'pointer' : 'not-allowed',
                                                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                                                boxShadow: nameMatches && !deleting ? '0 0 20px rgba(200,0,0,0.4)' : 'none',
                                                transition: 'all 0.2s',
                                            }}>
                                            {deleting ? 'Deleting…' : '🗑️ Delete Permanently'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Turfs Grid ── */}
            <motion.div key="turfs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span style={{ color: C.muted, fontSize: 14 }}>{turfs.length} turf{turfs.length !== 1 ? 's' : ''} total</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onRefresh} style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                            🔄 Refresh
                        </button>
                        <button onClick={onCreateTurf} style={{ background: '#00e599', color: '#0a0a0a', fontWeight: 700, padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                            + Add Turf
                        </button>
                    </div>
                </div>

                {turfs.length === 0 ? (
                    <div style={{ ...cardStyle, padding: 64, textAlign: 'center' }}>
                        <div style={{ fontSize: 56, marginBottom: 20 }}>🏟️</div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 8 }}>No turfs yet</h3>
                        <p style={{ color: C.muted, marginBottom: 24 }}>Create your first turf — it will instantly appear on the customer booking portal.</p>
                        <button onClick={onCreateTurf} style={{ ...btnNeon, width: 'auto', padding: '12px 32px' }}>+ Create First Turf</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                        {turfs.map((turf, i) => (
                            <motion.div key={turf.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                style={{ ...cardStyle, overflow: 'hidden', border: `1px solid ${turf.status === 'active' ? 'rgba(0,255,136,0.12)' : C.border}` }}>
                                {turf.image_urls && turf.image_urls.length > 0 && (
                                    <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                                        <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${turf.image_urls[0]}`}
                                            alt={turf.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        {turf.image_urls.length > 1 && (
                                            <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: C.white, fontSize: 11, padding: '3px 8px', borderRadius: 6 }}>
                                                +{turf.image_urls.length - 1} more
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div style={{ height: 5, background: turf.status === 'active' ? '#00e599' : 'rgba(255,255,255,0.08)' }} />
                                <div style={{ padding: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontSize: 20 }}>{FACILITY_EMOJIS[turf.facility_type] || '🏏'}</span>
                                                <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Outfit, sans-serif' }}>{turf.name}</span>
                                            </div>
                                            <span style={{ fontSize: 11, color: C.muted }}>ID #{turf.id} · {FACILITY_LABELS[turf.facility_type] || turf.facility_type}</span>
                                        </div>
                                        <button onClick={() => onToggleStatus(turf)} title={turf.status === 'active' ? 'Click to deactivate' : 'Click to activate'}
                                            style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: turf.status === 'active' ? 'rgba(0,255,136,0.12)' : 'rgba(255,68,68,0.12)', color: turf.status === 'active' ? C.green : C.red }}>
                                            {turf.status === 'active' ? '● Active' : '○ Inactive'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: C.muted }}>Price</span>
                                            <span style={{ color: C.blue, fontWeight: 700 }}>₹{turf.base_price}/slot</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: C.muted }}>Hours</span>
                                            <span>{turf.operating_start_time} – {turf.operating_end_time}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: C.muted }}>Slot size</span>
                                            <span>{turf.slot_duration_minutes} min</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => onEditTurf(turf)}
                                            style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.white, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => openDeleteModal(turf)}
                                            style={{ padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif', background: 'rgba(255,68,68,0.12)', color: C.red, whiteSpace: 'nowrap' }}>
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </>
    );
}
