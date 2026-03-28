'use client';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer style={{
            background: '#080C10',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '40px 24px 32px',
            marginTop: 'auto',
        }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 32,
                    marginBottom: 32,
                }}>
                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <img src="/LOGO_1.jpeg" alt="Viswa Sports Arena" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, color: '#F0F4F8' }}>
                                Viswa Sports Arena
                            </span>
                        </div>
                        <p style={{ color: '#6B7A8D', fontSize: 13, lineHeight: 1.7, maxWidth: 240 }}>
                            Premium cricket &amp; football turf in Kinathukadavu, Tamil Nadu. Book your game online — instant confirmation.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: '#F0F4F8', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Quick Links
                        </h4>
                        {[
                            { href: '/', label: 'Home' },
                            { href: '/turfs', label: 'Book a Turf' },
                            { href: '/bookings', label: 'My Bookings' },
                            { href: '/login', label: 'Sign In' },
                        ].map(({ href, label }) => (
                            <Link key={href} href={href} style={{ display: 'block', color: '#6B7A8D', fontSize: 13, textDecoration: 'none', marginBottom: 8, transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#00e599')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: '#F0F4F8', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Contact Us
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <a href="tel:+919629621147" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7A8D', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#00e599')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
                            >
                                <span style={{ fontSize: 16 }}>📞</span>
                                +91 96296 21147
                            </a>
                            <a href="mailto:viswasportsarena@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7A8D', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#00e599')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
                            >
                                <span style={{ fontSize: 16 }}>✉️</span>
                                viswasportsarena@gmail.com
                            </a>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#6B7A8D', fontSize: 13 }}>
                                <span style={{ fontSize: 16, marginTop: 1 }}>📍</span>
                                <span>23 A Bhagavathypalyam Pirivu,<br />Kinathukadavu, Tamil Nadu</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: 20,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <p style={{ color: '#4A5568', fontSize: 12 }}>
                        © {new Date().getFullYear()} Viswa Sports Arena. All rights reserved.
                    </p>
                    <p style={{ color: '#4A5568', fontSize: 12 }}>
                        Kinathukadavu, Tamil Nadu 🏏
                    </p>
                </div>
            </div>
        </footer>
    );
}
