'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { C, cardStyle, inputStyle, labelStyle, Turf } from './admin-styles';
import { adminGetAllBookings } from '@/lib/api';

interface Booking {
    id: number;
    date: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    total_price: number;
    amount_paid: number;
    payment_type: string | null;
    with_bowling_machine: boolean;
    created_at: string;
    turf: { id: number; name: string; facility_type: string };
    customer: { id: number; name: string; mobile: string; email: string };
    slots: { start: string; end: string }[];
}

interface BookingsTabProps {
    turfs: Turf[];
}

const STATUS_COLORS = {
    confirmed: { bg: 'rgba(0,229,153,0.10)', color: '#00e599', label: '✓ Confirmed' },
    pending: { bg: 'rgba(255,196,0,0.10)', color: '#FFC400', label: '⏳ Pending' },
    cancelled: { bg: 'rgba(255,68,68,0.10)', color: '#FF6B6B', label: '✗ Cancelled' },
};

export default function BookingsTab({ turfs }: BookingsTabProps) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterTurf, setFilterTurf] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterTurf) params.turf_id = Number(filterTurf);
            if (filterStatus) params.status = filterStatus;
            if (filterFrom) params.from_date = filterFrom;
            if (filterTo) params.to_date = filterTo;
            const res = await adminGetAllBookings(params);
            setBookings(res.data);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Failed to load bookings';
            toast.error(msg);
        }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const totalRevenue = confirmed.reduce((s, b) => s + b.amount_paid, 0);

    return (
        <motion.div key="bookings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Bookings', value: bookings.length, color: C.blue },
                    { label: 'Confirmed', value: confirmed.length, color: '#00e599' },
                    { label: 'Revenue Collected', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: '#FFC400' },
                ].map(s => (
                    <div key={s.label} style={{ ...cardStyle, padding: '20px 24px' }}>
                        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ ...cardStyle, padding: '18px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 160px' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Turf</div>
                    <select value={filterTurf} onChange={e => setFilterTurf(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', padding: '8px 12px' }}>
                        <option value="">All Turfs</option>
                        {turfs.map(t => <option key={t.id} value={t.id} style={{ background: '#131920' }}>{t.name}</option>)}
                    </select>
                </div>
                <div style={{ flex: '1 1 130px' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', padding: '8px 12px' }}>
                        <option value="">All</option>
                        <option value="confirmed" style={{ background: '#131920' }}>Confirmed</option>
                        <option value="pending" style={{ background: '#131920' }}>Pending</option>
                        <option value="cancelled" style={{ background: '#131920' }}>Cancelled</option>
                    </select>
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</div>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark', padding: '8px 12px' }} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</div>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark', padding: '8px 12px' }} />
                </div>
                <button onClick={load} disabled={loading} style={{
                    padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: '#00e599', color: '#0a0a0a',
                    fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif',
                    opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
                }}>
                    {loading ? '⏳ Loading…' : '🔍 Search'}
                </button>
            </div>

            {/* Bookings table */}
            {bookings.length === 0 && !loading ? (
                <div style={{ ...cardStyle, padding: 64, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 8 }}>No bookings found</div>
                    <div style={{ color: C.muted, fontSize: 13 }}>Try adjusting your filters or check back later.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {bookings.map((b, i) => {
                        const sc = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                        const isExpanded = expandedId === b.id;
                        return (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                style={{ ...cardStyle, overflow: 'hidden', border: `1px solid ${isExpanded ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'}`, transition: 'border-color 0.2s' }}>

                                {/* Row header — clickable to expand */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap' }}>

                                    {/* Status badge */}
                                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                                        {sc.label}
                                    </span>

                                    {/* Booking ID + turf */}
                                    <div style={{ flex: 1, minWidth: 180 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                                            #{b.id} · {b.turf.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>
                                            {b.date} · {b.slots.length} slot{b.slots.length !== 1 ? 's' : ''}
                                            {b.slots.length > 0 && ` (${b.slots[0].start}–${b.slots[b.slots.length - 1].end})`}
                                        </div>
                                    </div>

                                    {/* Customer */}
                                    <div style={{ minWidth: 160 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>👤 {b.customer.name}</div>
                                        <div style={{ fontSize: 12, color: C.muted }}>📞 {b.customer.mobile}</div>
                                    </div>

                                    {/* Price */}
                                    <div style={{ textAlign: 'right', minWidth: 90 }}>
                                        <div style={{ fontWeight: 800, color: C.blue, fontSize: 15 }}>₹{b.amount_paid.toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: 11, color: C.muted }}>{b.payment_type === 'advance' ? 'Advance paid' : 'Full paid'}</div>
                                    </div>

                                    {/* Expand arrow */}
                                    <span style={{ color: C.muted, fontSize: 14, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
                                </div>

                                {/* Expanded details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden' }}>
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                                                {/* Customer details */}
                                                <div>
                                                    <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Customer</div>
                                                    {[
                                                        { label: 'Name', value: b.customer.name },
                                                        { label: 'Mobile', value: b.customer.mobile },
                                                        { label: 'Email', value: b.customer.email },
                                                        { label: 'Customer ID', value: `#${b.customer.id}` },
                                                    ].map(row => (
                                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                                                            <span style={{ color: C.muted }}>{row.label}</span>
                                                            <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 180, wordBreak: 'break-all' }}>{row.value}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Booking details */}
                                                <div>
                                                    <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Booking</div>
                                                    {[
                                                        { label: 'Date', value: b.date },
                                                        { label: 'Turf', value: b.turf.name },
                                                        { label: 'Total Price', value: `₹${b.total_price.toLocaleString('en-IN')}` },
                                                        { label: 'Amount Paid', value: `₹${b.amount_paid.toLocaleString('en-IN')}` },
                                                        { label: 'Bowling Machine', value: b.with_bowling_machine ? 'Yes' : 'No' },
                                                    ].map(row => (
                                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                                                            <span style={{ color: C.muted }}>{row.label}</span>
                                                            <span style={{ fontWeight: 600 }}>{row.value}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Slot times */}
                                                <div>
                                                    <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Slots Booked</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        {b.slots.length === 0
                                                            ? <span style={{ color: C.muted, fontSize: 13 }}>No slot data</span>
                                                            : b.slots.map((s, si) => (
                                                                <div key={si} style={{ padding: '5px 10px', background: 'rgba(0,212,255,0.07)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: C.blue, border: '1px solid rgba(0,212,255,0.15)' }}>
                                                                    {s.start} – {s.end}
                                                                </div>
                                                            ))
                                                        }
                                                        <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>
                                                            Booked on {new Date(b.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
