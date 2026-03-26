'use client';
import { motion } from 'framer-motion';
import { C, cardStyle, Analytics, Turf } from './admin-styles';

interface DashboardTabProps {
    analytics: Analytics | null;
    turfs: Turf[];
}

export default function DashboardTab({ analytics, turfs }: DashboardTabProps) {
    const statCards = [
        { label: 'Total Revenue', value: `₹${(analytics?.total_revenue ?? 0).toLocaleString('en-IN')}`, color: C.green, icon: '💰', sub: 'All confirmed' },
        { label: 'Confirmed', value: analytics?.total_confirmed_bookings ?? '—', color: C.blue, icon: '✅', sub: 'Paid bookings' },
        { label: 'Pending', value: analytics?.total_pending_bookings ?? '—', color: C.yellow, icon: '⏳', sub: 'Awaiting payment' },
        { label: 'Active Turfs', value: turfs.filter(t => t.status === 'active').length, color: '#a78bfa', icon: '🏟️', sub: `${turfs.length} total` },
    ];

    return (
        <motion.div key="dash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
                {statCards.map(s => (
                    <div key={s.label} style={{ ...cardStyle, padding: '22px 20px', borderTop: `2px solid ${s.color}33` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                            <span style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                            <span style={{ fontSize: 20 }}>{s.icon}</span>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: s.color, marginBottom: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{s.sub}</div>
                    </div>
                ))}
            </div>
            <div style={{ ...cardStyle, padding: '22px 24px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 16 }}>Quick Actions</h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                        { href: '/admin?tab=turfs', label: '🏟️ Turfs', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)', color: C.blue },
                        { href: '/admin?tab=slots', label: '📅 Slots', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)', color: C.green },
                        { href: '/admin?tab=bookings', label: '📋 Bookings', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', color: '#a78bfa' },
                        { href: '/admin?tab=discounts', label: '🏷️ Discounts', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)', color: C.yellow },
                        { href: '/admin?tab=ads', label: '📢 Advertisements', bg: 'rgba(255,99,71,0.08)', border: 'rgba(255,99,71,0.2)', color: '#ff6347' },
                        { href: 'http://localhost:8000/docs', label: '📖 API Docs ↗', bg: C.card, border: C.border, color: C.muted, external: true },
                    ].map(a => (
                        <a key={a.label} href={a.href} target={(a as any).external ? '_blank' : undefined} rel="noreferrer"
                            style={{ textDecoration: 'none', padding: '10px 18px', borderRadius: 10, background: a.bg, border: `1px solid ${a.border}`, color: a.color, fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                            {a.label}
                        </a>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
