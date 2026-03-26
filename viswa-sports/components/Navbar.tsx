'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/turfs', label: 'Book a Turf' },
];

const AUTH_LINKS = [
    { href: '/bookings', label: 'My Bookings' },
    { href: '/profile', label: 'Profile' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        if (typeof window !== 'undefined') {
            setIsLoggedIn(!!localStorage.getItem('viswa_token'));
        }
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Re-check login state on route change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLoggedIn(!!localStorage.getItem('viswa_token'));
        }
    }, [pathname]);

    // Admin portal has its own layout — never show customer navbar there
    if (pathname.startsWith('/admin')) return null;

    const handleLogout = () => {
        localStorage.removeItem('viswa_token');
        setIsLoggedIn(false);
        setMenuOpen(false);
        router.push('/');
    };

    const linkStyle = (href: string): React.CSSProperties => ({
        textDecoration: 'none', fontSize: 14, fontWeight: 500,
        color: pathname === href ? '#00e599' : '#8B9CB0',
        transition: 'color 0.2s',
    });

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
            transition: 'all 0.3s ease',
            background: scrolled ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderBottom: scrolled ? '1px solid rgba(0,229,153,0.12)' : '1px solid rgba(255,255,255,0.05)',
        }}>
            <div style={{
                maxWidth: '1280px', margin: '0 auto',
                padding: '16px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/LOGO_1.jpeg"
                        alt="Viswa Sports Arena"
                        style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 6 }}
                    />
                </Link>

                {/* Desktop Nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="desktop-nav">
                    {NAV_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} style={linkStyle(link.href)}
                            onMouseEnter={e => { if (pathname !== link.href) (e.target as HTMLElement).style.color = '#fff'; }}
                            onMouseLeave={e => { if (pathname !== link.href) (e.target as HTMLElement).style.color = '#8B9CB0'; }}>
                            {link.label}
                        </Link>
                    ))}

                    {isLoggedIn && AUTH_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} style={linkStyle(link.href)}
                            onMouseEnter={e => { if (pathname !== link.href) (e.target as HTMLElement).style.color = '#fff'; }}
                            onMouseLeave={e => { if (pathname !== link.href) (e.target as HTMLElement).style.color = '#8B9CB0'; }}>
                            {link.label}
                        </Link>
                    ))}

                    {isLoggedIn ? (
                        <button onClick={handleLogout} style={{
                            background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)',
                            color: '#FF6B6B', fontSize: 14, fontWeight: 600,
                            padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}>
                            Logout
                        </button>
                    ) : (
                        <Link href="/login" style={{
                            background: '#00e599',
                            color: '#000000', fontWeight: 700, padding: '10px 24px',
                            borderRadius: 10, textDecoration: 'none', fontSize: 14,
                            boxShadow: '0 0 16px rgba(0,229,153,0.3)',
                        }}>
                            Login
                        </Link>
                    )}
                </div>

                {/* Mobile Hamburger */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="mobile-menu-btn"
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 24, padding: 4 }}
                >
                    {menuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile Dropdown */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(24px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}
                        className="mobile-menu"
                    >
                        <div style={{ padding: '16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {NAV_LINKS.map((link) => (
                                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                                    style={{ color: '#8B9CB0', textDecoration: 'none', fontSize: 16 }}>
                                    {link.label}
                                </Link>
                            ))}
                            {isLoggedIn && AUTH_LINKS.map((link) => (
                                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                                    style={{ color: '#8B9CB0', textDecoration: 'none', fontSize: 16 }}>
                                    {link.label}
                                </Link>
                            ))}
                            {isLoggedIn ? (
                                <button onClick={handleLogout} style={{
                                    background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)',
                                    color: '#FF6B6B', fontWeight: 700, padding: '12px 24px',
                                    borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                                    fontSize: 15,
                                }}>
                                    Logout
                                </button>
                            ) : (
                                <Link href="/login" onClick={() => setMenuOpen(false)} style={{
                                    background: '#00e599',
                                    color: '#0a0a0a', fontWeight: 700, padding: '12px 24px',
                                    borderRadius: 10, textDecoration: 'none', textAlign: 'center',
                                }}>
                                    Login
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
        @media (min-width: 768px) {
          .mobile-menu-btn { display: none !important; }
          .mobile-menu { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
        </nav>
    );
}
