'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { googleLogin } from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // If already logged in, skip straight to turfs
    useEffect(() => {
        if (localStorage.getItem('viswa_token')) {
            router.replace('/turfs');
        }
    }, [router]);

    const handleGoogleSuccess = async (credentialResponse: any) => {
        const id_token = credentialResponse?.credential;
        if (!id_token) {
            toast.error('Google sign-in failed — no credential received.');
            return;
        }
        setLoading(true);
        try {
            const res = await googleLogin(id_token);
            localStorage.setItem('viswa_token', res.data.access_token);
            window.dispatchEvent(new CustomEvent('viswa:logged_in'));
            if (!res.data.has_mobile) {
                // First-time user — ask them to add a mobile number before booking
                toast('Welcome! Please add your mobile number to complete your profile.', {
                    icon: '📱',
                    duration: 4000,
                    style: { background: '#0a1f14', border: '1px solid rgba(0,229,153,0.4)', color: '#00e599', fontWeight: 600 },
                });
                router.push('/profile?setup=1');
            } else {
                toast.success('Welcome back! 🎉');
                router.push('/turfs');
            }
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Sign-in failed. Please try again.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };


    const handleGoogleError = () => {
        toast.error('Google sign-in was cancelled or failed. Please try again.');
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div style={{
                minHeight: '100vh',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Ambient glows */}
                <div style={{
                    position: 'absolute', top: '30%', left: '50%',
                    transform: 'translateX(-50%)',
                    width: 500, height: 500, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,229,153,0.1) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '20%', right: '15%',
                    width: 300, height: 300, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(66,133,244,0.07) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{
                        width: '100%',
                        maxWidth: 420,
                        position: 'relative',
                        zIndex: 1,
                        background: 'rgba(255,255,255,0.035)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 24,
                        padding: '48px 40px 44px',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 64px rgba(0,0,0,0.5)',
                    }}>

                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        style={{ textAlign: 'center', marginBottom: 36 }}
                    >
                        <img
                            src="/LOGO_1.jpeg"
                            alt="Viswa Sports Arena"
                            style={{ width: 160, height: 'auto', margin: '0 auto 16px', display: 'block', borderRadius: 14 }}
                        />
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#F0F4F8', fontFamily: 'Outfit, sans-serif' }}>
                            Viswa Sports Arena
                        </h1>
                        <p style={{ color: '#8B9CB0', marginTop: 6, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                            Login to book your game
                        </p>
                    </motion.div>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ color: '#5A6A7A', fontSize: 12, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            Continue with
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </div>

                    {/* Google Sign-In Button */}
                    <div className="google-btn-container">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            theme="filled_black"
                            size="large"
                            shape="pill"
                            text="signin_with"
                            logo_alignment="left"
                        />
                    </div>

                    {/* Loading overlay text */}
                    {loading && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', color: '#00e599', fontSize: 14, marginTop: 18, fontFamily: 'Inter, sans-serif' }}
                        >
                            Signing you in…
                        </motion.p>
                    )}

                    {/* Footer */}
                    <p style={{
                        color: '#4A5A6A',
                        fontSize: 12,
                        textAlign: 'center',
                        marginTop: 32,
                        lineHeight: 1.6,
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        🔒 Secure sign-in via Google. No passwords stored.<br />
                        By signing in you agree to our terms of service.
                    </p>
                </motion.div>
            </div>
        </GoogleOAuthProvider>
    );
}
