'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveAd } from '@/lib/api';

interface Ad {
    id: number;
    title?: string;
    image_url: string;
    link_url?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AD_EVENT = 'viswa:logged_in'; // custom event fired by login page

export default function AdPopup() {
    const [ad, setAd] = useState<Ad | null>(null);
    const [visible, setVisible] = useState(false);

    const showAdIfActive = useCallback(async () => {
        // Reset any previously shown ad so state is clean
        setAd(null);
        setVisible(false);
        try {
            const r = await getActiveAd();
            if (!r.data) return;
            setAd(r.data);
            setVisible(true);
        } catch {
            // silently ignore — ad is non-critical
        }
    }, []);

    useEffect(() => {
        // Listen for the custom login event dispatched synchronously
        // by login/page.tsx before router.push(). Since the layout
        // persists across navigations, this listener is already registered.
        const onLogin = () => showAdIfActive();
        window.addEventListener(AD_EVENT, onLogin);
        return () => window.removeEventListener(AD_EVENT, onLogin);
    }, [showAdIfActive]);

    const dismiss = () => setVisible(false);

    if (!ad) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="ad-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={dismiss}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9000,
                        background: 'rgba(0,0,0,0.82)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <motion.div
                        key="ad-card"
                        initial={{ opacity: 0, scale: 0.88, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88, y: 40 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            background: '#0f0f0f',
                            border: '1px solid rgba(0,229,153,0.15)',
                            borderRadius: 24,
                            overflow: 'hidden',
                            maxWidth: 480,
                            width: '100%',
                        }}
                    >
                        {/* Close button */}
                        <button onClick={dismiss} style={{
                            position: 'absolute', top: 12, right: 12, zIndex: 10,
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff', fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700,
                        }}>✕</button>

                        {/* Ad image — clickable if link provided */}
                        {ad.link_url ? (
                            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={dismiss}>
                                <img src={`${API_URL}${ad.image_url}`} alt={ad.title || 'Advertisement'}
                                    style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
                            </a>
                        ) : (
                            <img src={`${API_URL}${ad.image_url}`} alt={ad.title || 'Advertisement'}
                                style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
                        )}

                        {/* Footer */}
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                {ad.title && <div style={{ fontWeight: 800, fontSize: 15, fontFamily: 'Outfit, sans-serif', color: '#F0F4F8' }}>{ad.title}</div>}
                                {ad.link_url && <div style={{ fontSize: 12, color: 'rgba(0,229,153,0.7)', marginTop: 2 }}>Tap the image to learn more →</div>}
                            </div>
                            <button onClick={dismiss} style={{
                                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
                                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, whiteSpace: 'nowrap',
                            }}>Dismiss</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
