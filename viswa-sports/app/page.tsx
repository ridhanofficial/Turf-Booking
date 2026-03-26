'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import RetroGrid from '@/components/RetroGrid';
import MagicCard from '@/components/MagicCard';
import BorderBeam from '@/components/BorderBeam';

const TURF_TYPES = [
  { image: '/full_turf_pitch.png', name: 'Full Turf Pitch', key: 'full_pitch', desc: 'Professional full-length cricket pitch' },
  { image: '/normal_practice_nets.png', name: 'Normal Practice Nets', key: 'net_normal', desc: 'Batting & bowling practice nets (standard surface)' },
  { image: '/cement_practice_nets.png', name: 'Cement Practice Nets', key: 'net_cement', desc: 'Cement-surface batting & bowling practice nets' },
];

const FEATURES = [
  {
    emoji: '⚡',
    color: '#00e599',
    bg: 'rgba(0,229,153,0.1)',
    title: 'Instant Booking',
    desc: 'Reserve your slot in seconds with real-time availability.',
  },
  {
    emoji: '🛡️',
    color: '#00e599',
    bg: 'rgba(0,229,153,0.08)',
    title: 'Secure Payments',
    desc: 'Razorpay-powered, 100% safe & encrypted transactions.',
  },
  {
    emoji: '🕐',
    color: '#FFD700',
    bg: 'rgba(255,215,0,0.08)',
    title: 'Flexible Slots',
    desc: 'Morning to midnight — book any slot that suits you.',
  },
];

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#F0F4F8' }}>

      {/* ── HERO ── */}
      <section className="hero-section" style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '120px 24px 80px',
      }}>
        {/* RetroGrid background (Linkify) */}
        <RetroGrid opacity={0.35} />

        {/* Ambient glow — top center */}
        <div style={{
          position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,153,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 800 }}>
          {/* MagicBadge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: 32, display: 'inline-block' }}
          >
            <div className="magic-badge">
              <span className="magic-badge-beam" />
              <span className="magic-badge-inner" style={{ fontSize: 13, color: '#00e599', fontWeight: 600 }}>
                ⚡ Play Without the Wait
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            style={{ fontSize: 'clamp(48px, 8vw, 88px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-2px', fontFamily: 'Outfit, sans-serif' }}
          >
            <span style={{ color: '#ffffff' }}>Book Your Game.</span>
            <br />
            <span style={{ color: '#00e599' }}>Own the Moment.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            style={{ fontSize: 18, color: '#8B9CB0', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}
          >
            Live availability. Instant confirmation. Zero booking stress.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}
            className="hero-buttons"
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link href="/turfs" style={{
              background: '#00e599',
              color: '#000000', fontWeight: 800, padding: '16px 36px',
              borderRadius: 14, textDecoration: 'none', fontSize: 16,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 28px rgba(0,229,153,0.35)',
            }}>
              Explore Slots →
            </Link>
            <Link href="/turfs" style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontWeight: 600, padding: '16px 36px',
              borderRadius: 14, textDecoration: 'none', fontSize: 16,
            }}>
              View Turfs
            </Link>
          </motion.div>
        </div>
      </section>



      {/* ── TURF TYPES ── */}
      <section className="section-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >

          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>
            Choose Your{' '}
            <span style={{ color: '#00e599' }}>Turf</span>
          </h2>
          <p style={{ color: '#8B9CB0', fontSize: 16 }}>Premium cricket facilities — full pitch & practice nets</p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 28,
        }}>
          {TURF_TYPES.map((turf, i) => (
            <motion.div
              key={turf.key}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              whileHover={{ y: -8, scale: 1.03 }}
              style={{ height: '100%' }}
            >
              <Link href={`/turfs?facility=${turf.key}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                <MagicCard
                  glowColor="rgba(0,229,153,0.18)"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 24,
                    cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                    height: 360,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    background: '#0a0f14',
                  }}
                >
                  {/* Full-bleed photo */}
                  <img
                    src={turf.image}
                    alt={turf.name}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                      filter: 'brightness(0.78) saturate(1.12)',
                    }}
                  />
                  {/* Dark gradient overlay for text readability */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.05) 100%)',
                    pointerEvents: 'none',
                  }} />
                  {/* Green top accent line */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, transparent, #00e599, transparent)',
                    opacity: 0.7,
                  }} />
                  {/* Text content */}
                  <div style={{ position: 'relative', zIndex: 2, padding: '28px 28px 32px' }}>
                    <div style={{
                      display: 'inline-block',
                      background: 'rgba(0,229,153,0.12)',
                      border: '1px solid rgba(0,229,153,0.3)',
                      borderRadius: 8, padding: '3px 10px',
                      fontSize: 11, fontWeight: 700, color: '#00e599',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginBottom: 10,
                    }}>Cricket</div>
                    <div style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, marginBottom: 8, fontFamily: 'Outfit, sans-serif', lineHeight: 1.2 }}>
                      {turf.name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.6 }}>
                      {turf.desc}
                    </div>
                  </div>
                </MagicCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section-pad" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Subtle ambient glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,153,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >

            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>
              Why{' '}
              <span style={{ color: '#00e599' }}>Viswa Sports?</span>
            </h2>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              >
                {/* MagicCard on feature cards */}
                <MagicCard
                  glowColor="rgba(0,229,153,0.12)"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 20, padding: '36px 32px',
                    height: '100%',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: feat.bg, border: `1px solid ${feat.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, marginBottom: 24,
                  }}>
                    {feat.emoji}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, fontFamily: 'Outfit, sans-serif' }}>
                    {feat.title}
                  </h3>
                  <p style={{ color: '#8B9CB0', lineHeight: 1.7, fontSize: 15 }}>{feat.desc}</p>
                </MagicCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-pad">
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="cta-card"
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 24,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 60px rgba(0,229,153,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* BorderBeam on CTA card (Linkify) */}
            <BorderBeam size={300} duration={8} colorFrom="#00e599" colorTo="transparent" borderWidth={1.5} />

            {/* Ambient glow inside CTA */}
            <div style={{
              position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
              width: 500, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,229,153,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>

              <h2 style={{
                fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800,
                fontFamily: 'Outfit, sans-serif', marginBottom: 16,
              }}>
                Ready to{' '}
                <span style={{ color: '#00e599' }}>Play?</span>
              </h2>
              <p style={{ color: '#8B9CB0', fontSize: 17, marginBottom: 36 }}>
                Book your slot now and experience sports like never before.
              </p>
              <Link href="/turfs" className="cta-btn" style={{
                background: '#00e599',
                color: '#000000', fontWeight: 800, padding: '18px 48px',
                borderRadius: 14, textDecoration: 'none', fontSize: 17,
                display: 'inline-block',
                boxShadow: '0 0 28px rgba(0,229,153,0.35)',
              }}>
                Book Now →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '28px 24px', textAlign: 'center',
        color: '#8B9CB0', fontSize: 14,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <img src="/LOGO_1.jpeg" alt="Viswa Sports Arena" style={{ width: 120, height: 'auto' }} />
        © 2026 Viswa Sports Arena. All rights reserved.
      </footer>
    </div>
  );
}
