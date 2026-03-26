'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { getMyProfile, updateMyProfile } from '@/lib/api';

export default function ProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSetup = searchParams.get('setup') === '1'; // first-time setup flow

    const [profile, setProfile] = useState<{
        mobile_number?: string | null;
        name?: string;
        email?: string;
        created_at?: string;
    } | null>(null);

    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');

    const [mobileError, setMobileError] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('viswa_token');
        if (!token) { router.push('/login'); return; }
        getMyProfile()
            .then(res => {
                setProfile(res.data);
                setName(res.data.name || '');
                setMobile(res.data.mobile_number || '');
            })
            .catch(() => toast.error('Failed to load profile'))
            .finally(() => setLoading(false));
    }, [router]);

    const validateMobile = (value: string) => {
        if (!value) return 'Mobile number is required to book a turf.';
        if (!/^\d{10}$/.test(value)) return 'Enter a valid 10-digit mobile number.';
        return '';
    };

    const handleSave = async () => {
        // Always validate mobile on save
        const mobileErr = validateMobile(mobile);
        if (mobileErr) {
            setMobileError(mobileErr);
            return;
        }
        setMobileError('');
        setSaving(true);
        try {
            const updated = await updateMyProfile({
                name: name || undefined,
                mobile_number: mobile || undefined,
            });
            setProfile(updated.data);
            toast.success('Profile updated! ✅');
            if (isSetup) {
                // First-time setup complete — take them to turfs
                setTimeout(() => router.push('/turfs'), 800);
            }
        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;
            if (status === 409) {
                toast(detail || 'Conflict updating profile.', {
                    icon: '📧',
                    style: {
                        background: '#1a1200',
                        border: '1px solid rgba(255,215,0,0.4)',
                        color: '#FFD700',
                        fontWeight: 600,
                        fontSize: 14,
                    },
                });
            } else if (status === 422) {
                setMobileError(detail || 'Invalid mobile number.');
            } else {
                toast.error(detail || 'Failed to update profile');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('viswa_token');
        toast.success('Logged out');
        router.push('/');
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
        padding: '14px 16px', color: '#F0F4F8', fontSize: 15,
        outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
        transition: 'border-color 0.2s',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block', color: '#8B9CB0', fontSize: 13, marginBottom: 8, fontWeight: 600,
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#000000', paddingTop: 120 }}>
                <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ height: 300, borderRadius: 20, background: 'rgba(255,255,255,0.04)' }} className="shimmer" />
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#000000', color: '#F0F4F8', paddingTop: 100, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
                    <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>
                        My{' '}
                        <span style={{ color: '#00e599' }}>Profile</span>
                    </h1>
                    <p style={{ color: '#8B9CB0', fontSize: 15 }}>Manage your personal details</p>
                </motion.div>

                {/* ── First-time setup banner ── */}
                {isSetup && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: 'rgba(0,229,153,0.08)',
                            border: '1px solid rgba(0,229,153,0.3)',
                            borderRadius: 14, padding: '18px 24px',
                            marginBottom: 24,
                            display: 'flex', alignItems: 'flex-start', gap: 14,
                        }}
                    >
                        <span style={{ fontSize: 22, flexShrink: 0 }}>📱</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#00e599', fontSize: 15, marginBottom: 4, fontFamily: 'Outfit, sans-serif' }}>
                                One more step before you book!
                            </div>
                            <div style={{ color: '#8B9CB0', fontSize: 13, lineHeight: 1.6 }}>
                                Add your mobile number below so the admin can contact you about your bookings. This is required to place any booking.
                            </div>
                        </div>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {/* Avatar card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 20, padding: '28px 32px', marginBottom: 20,
                        display: 'flex', alignItems: 'center', gap: 20,
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                            background: '#00e599',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 26, fontWeight: 800, color: '#0a0a0a', fontFamily: 'Outfit, sans-serif',
                        }}>
                            {profile?.name ? profile.name.charAt(0).toUpperCase() : '⚡'}
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 4 }}>
                                {profile?.name || 'Player'}
                            </div>
                            <div style={{ fontSize: 14, color: profile?.mobile_number ? '#8B9CB0' : '#FF6B6B' }}>
                                {profile?.mobile_number
                                    ? `📱 ${profile.mobile_number}`
                                    : '⚠️ No mobile number — required to book'}
                            </div>
                            {profile?.created_at && (
                                <div style={{ fontSize: 12, color: '#4A5568', marginTop: 4 }}>
                                    Member since {new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit form */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 20, padding: '28px 32px', marginBottom: 20,
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
                    }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, fontFamily: 'Outfit, sans-serif' }}>
                            Edit Details
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Mobile Number — now editable */}
                            <div>
                                <label style={labelStyle}>
                                    Mobile Number{' '}
                                    <span style={{ color: '#FF6B6B', fontWeight: 700 }}>*</span>
                                    <span style={{ color: '#4A5568', fontWeight: 400, marginLeft: 6 }}>(required to book)</span>
                                </label>
                                <input
                                    style={{
                                        ...inputStyle,
                                        borderColor: mobileError
                                            ? 'rgba(255,107,107,0.5)'
                                            : 'rgba(255,255,255,0.12)',
                                    }}
                                    placeholder="10-digit mobile number (e.g. 9876543210)"
                                    value={mobile}
                                    maxLength={10}
                                    inputMode="numeric"
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setMobile(val);
                                        setMobileError('');
                                    }}
                                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,229,153,0.4)'; }}
                                    onBlur={e => {
                                        const err = validateMobile(mobile);
                                        setMobileError(err);
                                        if (!err) (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)';
                                    }}
                                />
                                {mobileError && (
                                    <p style={{ color: '#FF6B6B', fontSize: 12, marginTop: 6 }}>{mobileError}</p>
                                )}
                            </div>

                            <div>
                                <label style={labelStyle}>Full Name</label>
                                <input
                                    style={inputStyle}
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,229,153,0.4)'; }}
                                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input
                                    style={{ ...inputStyle, opacity: 0.45, cursor: 'not-allowed' }}
                                    type="email"
                                    value={profile?.email || ''}
                                    readOnly
                                    tabIndex={-1}
                                />
                                <p style={{ color: '#4A5568', fontSize: 12, marginTop: 6 }}>Email cannot be changed — it is your Google sign-in identity.</p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    background: saving ? 'rgba(0,229,153,0.2)' : '#00e599',
                                    color: '#000000', fontWeight: 800, padding: '14px 24px',
                                    border: 'none', borderRadius: 12, fontSize: 15,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    fontFamily: 'Outfit, sans-serif',
                                    boxShadow: saving ? 'none' : '0 0 20px rgba(0,229,153,0.3)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {saving ? 'Saving...' : isSetup ? 'Save & Continue →' : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Logout */}
                    <div style={{
                        background: 'rgba(255,68,68,0.04)', border: '1px solid rgba(255,68,68,0.12)',
                        borderRadius: 20, padding: '24px 32px',
                    }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, fontFamily: 'Outfit, sans-serif', color: '#FF6B6B' }}>
                            Logout
                        </h2>
                        <p style={{ color: '#8B9CB0', fontSize: 14, marginBottom: 16 }}>
                            You&apos;ll need to log in again after logging out.
                        </p>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)',
                                color: '#FF6B6B', fontWeight: 700, padding: '12px 24px',
                                borderRadius: 10, fontSize: 14, cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Outfit, sans-serif',
                            }}
                        >
                            Logout →
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
