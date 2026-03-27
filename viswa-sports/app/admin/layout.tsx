'use client';
import { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

/* ── Design tokens ─────────────────────────────────────────────────────── */
const C = {
    bg: '#080C10',
    sidebar: '#0D1117',
    topbar: 'rgba(13,17,23,0.95)',
    card: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.07)',
    blue: '#00e599',
    green: '#00e599',
    muted: '#6B7A8D',
    white: '#F0F4F8',
    active: 'rgba(0,229,153,0.08)',
    activeBorder: 'rgba(0,229,153,0.3)',
};

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { href: '/admin?tab=turfs', label: 'Turfs', icon: '🏟️' },
    { href: '/admin?tab=slots', label: 'Slots', icon: '📅' },
    { href: '/admin?tab=bookings', label: 'Bookings', icon: '📋' },
    { href: '/admin?tab=discounts', label: 'Discounts', icon: '🏷️' },
    { href: '/admin?tab=ads', label: 'Advertisements', icon: '📢' },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get('tab') || 'dashboard';

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem('viswa_admin_token'));
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('viswa_admin_token');
        localStorage.removeItem('viswa_token');
        setIsLoggedIn(false);
        router.push('/admin');
    };

    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>

            {/* ── Top bar ───────────────────────────────────────────────── */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                height: 60,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 24px',
            }}>
                {/* Left: logo + hamburger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setSidebarOpen(p => !p)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: C.white, fontSize: 20, display: 'none',
                            padding: 4,
                        }}
                        className="admin-hamburger"
                        aria-label="Toggle menu"
                    >
                        {sidebarOpen ? '✕' : '☰'}
                    </button>

                    {/* Logo */}
                    <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="/LOGO_1.jpeg" alt="Viswa Sports Arena" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, color: '#00e599' }}>
                            Admin
                        </span>
                    </Link>

                    {/* Divider + portal label — hidden on mobile */}
                    <div className="admin-portal-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 1, height: 20, background: C.border }} />
                        <span style={{ fontSize: 12, color: C.muted, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            Management Portal
                        </span>
                    </div>
                </div>

                {/* Right: customer portal link + logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Link
                        href="/"
                        target="_blank"
                        className="admin-customer-link"
                        style={{
                            textDecoration: 'none', fontSize: 13, color: C.muted,
                            padding: '6px 14px', borderRadius: 8,
                            border: `1px solid ${C.border}`,
                            display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s',
                            fontFamily: 'Inter, sans-serif',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        🔗 Customer Site
                    </Link>

                    {isLoggedIn && (
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'rgba(255,68,68,0.08)',
                                border: '1px solid rgba(255,68,68,0.2)',
                                color: '#FF6B6B', padding: '6px 14px', borderRadius: 8,
                                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            🚪 Logout
                        </button>
                    )}
                </div>
            </header>

            {/* ── Body (sidebar + content) ────────────────────────────── */}
            <div style={{ display: 'flex', paddingTop: 60, minHeight: '100vh' }}>

                {/* ── Sidebar (desktop always visible, mobile drawer) ── */}
                {isLoggedIn && (
                    <>
                        {/* Mobile overlay */}
                        {sidebarOpen && (
                            <div
                                onClick={() => setSidebarOpen(false)}
                                style={{
                                    position: 'fixed', inset: 0, zIndex: 90,
                                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                                    display: 'none',
                                }}
                                className="admin-overlay"
                            />
                        )}

                        <motion.aside
                            initial={false}
                            className={sidebarOpen ? 'open' : ''}
                            style={{
                                position: 'fixed', top: 60, left: 0, bottom: 0,
                                width: 220, zIndex: 95,
                                background: '#000000',
                                borderRight: '1px solid rgba(255,255,255,0.06)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                display: 'flex', flexDirection: 'column',
                                padding: '20px 12px',
                                overflowY: 'auto',
                            }}
                        >
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
                                    Navigation
                                </p>
                                {NAV_ITEMS.map(item => {
                                    // Extract the tab from the href (e.g. '/admin?tab=turfs' → 'turfs', '/admin' → 'dashboard')
                                    const itemTab = item.href.includes('?tab=') ? item.href.split('?tab=')[1] : 'dashboard';
                                    const isActive = activeTab === itemTab;
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            style={{
                                                textDecoration: 'none',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '9px 12px', borderRadius: 10,
                                                fontSize: 14, fontWeight: isActive ? 700 : 500,
                                                fontFamily: 'Inter, sans-serif',
                                                color: isActive ? '#00e599' : '#8B9CB0',
                                                position: 'relative',
                                                transition: 'color 0.2s',
                                            }}
                                        >
                                            {isActive && (
                                                <motion.span
                                                    layoutId="nav-active-pill"
                                                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                                    style={{
                                                        position: 'absolute', inset: 0, borderRadius: 10,
                                                        background: 'rgba(0,229,153,0.08)',
                                                        border: '1px solid rgba(0,229,153,0.3)',
                                                        zIndex: 0,
                                                    }}
                                                />
                                            )}
                                            <span style={{ fontSize: 16, flexShrink: 0, position: 'relative', zIndex: 1 }}>{item.icon}</span>
                                            <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                                            {isActive && (
                                                <div style={{
                                                    marginLeft: 'auto', width: 6, height: 6, position: 'relative', zIndex: 1,
                                                    borderRadius: '50%', background: C.blue,
                                                    boxShadow: `0 0 8px ${C.blue}`,
                                                }} />
                                            )}
                                        </Link>
                                    );
                                })}

                                {/* Spacer + divider */}
                                <div style={{ margin: '16px 0', borderTop: `1px solid ${C.border}` }} />
                                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
                                    System
                                </p>
                                <a
                                    href="http://localhost:8000/docs"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        textDecoration: 'none',
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '9px 12px', borderRadius: 10,
                                        fontSize: 14, fontWeight: 500, color: C.muted,
                                        fontFamily: 'Inter, sans-serif',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <span style={{ fontSize: 16 }}>📖</span>
                                    API Docs
                                    <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted }}>↗</span>
                                </a>
                            </nav>

                            {/* Side footer */}
                            <div style={{
                                padding: '12px', borderRadius: 10,
                                background: C.card, border: `1px solid ${C.border}`,
                                fontSize: 11, color: C.muted,
                                fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
                            }}>
                                <div style={{ fontWeight: 700, color: C.green, marginBottom: 2 }}>● System Online</div>
                                Viswa Sports Arena Admin v1.0
                            </div>
                        </motion.aside>
                    </>
                )}

                {/* ── Main content area ───────────────────────────────── */}
                <main style={{
                    flex: 1,
                    marginLeft: isLoggedIn ? 220 : 0,
                    minHeight: 'calc(100vh - 60px)',
                    background: C.bg,
                    transition: 'margin-left 0.3s ease',
                }}>
                    {children}
                </main>
            </div>

            {/* Responsive: hide sidebar on mobile, show hamburger */}
            <style>{`
                @media (max-width: 768px) {
                    .admin-hamburger { display: flex !important; }
                    aside { transform: translateX(-100%); transition: transform 0.3s ease; }
                    aside.open { transform: translateX(0) !important; }
                    .admin-overlay { display: block !important; }
                    main { margin-left: 0 !important; }
                    .admin-portal-label { display: none !important; }
                    .admin-customer-link { display: none !important; }
                    header { padding: 0 12px !important; }
                }
            `}</style>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080C10' }}>{children}</div>}>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </Suspense>
    );
}
