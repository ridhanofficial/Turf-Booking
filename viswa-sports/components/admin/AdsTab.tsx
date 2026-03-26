'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { C, cardStyle, inputStyle, labelStyle } from './admin-styles';
import { adminGetAds, adminCreateAd, adminUpdateAd, adminDeleteAd } from '@/lib/api';

interface Ad {
    id: number;
    title?: string;
    image_url: string;
    link_url?: string;
    is_active: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdsTab() {
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        setLoading(true);
        try { const r = await adminGetAds(); setAds(r.data); }
        catch { toast.error('Failed to load ads'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => {
        setTitle(''); setLinkUrl(''); setIsActive(true);
        setImageFile(null); setImagePreview(null);
        if (fileRef.current) fileRef.current.value = '';
        setShowForm(false);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be < 5 MB'); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleCreate = async () => {
        if (!imageFile) { toast.error('Select an image first'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            if (title) fd.append('title', title);
            if (linkUrl) fd.append('link_url', linkUrl);
            fd.append('is_active', String(isActive));
            fd.append('image', imageFile);
            await adminCreateAd(fd);
            toast.success('Advertisement created!');
            resetForm();
            await load();
        } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to create ad'); }
        finally { setSaving(false); }
    };

    const toggleActive = async (ad: Ad) => {
        try {
            const fd = new FormData();
            fd.append('is_active', String(!ad.is_active));
            await adminUpdateAd(ad.id, fd);
            toast.success(ad.is_active ? 'Ad deactivated' : 'Ad activated');
            await load();
        } catch { toast.error('Failed to update'); }
    };

    const handleDelete = async (id: number) => {
        setDeleting(id);
        try {
            await adminDeleteAd(id);
            toast.success('Advertisement deleted');
            await load();
        } catch { toast.error('Failed to delete'); }
        finally { setDeleting(null); }
    };

    return (
        <motion.div key="ads" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 14, color: C.muted }}>
                            The most recently <strong style={{ color: C.green }}>active</strong> ad is shown as a popup when users visit the site.
                        </div>
                    </div>
                    <button onClick={() => setShowForm(f => !f)}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#00e599', color: '#0a0a0a', fontWeight: 800, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                        {showForm ? '✕ Cancel' : '+ New Ad'}
                    </button>
                </div>

                {/* Create form */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ ...cardStyle, padding: 28, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'Outfit, sans-serif', marginBottom: 20 }}>📢 New Advertisement</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Title (optional)</label>
                                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Grand Opening — 20% OFF" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Destination URL (optional)</label>
                                    <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com/offer" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Ad Image *</label>
                                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleImageChange} style={{ display: 'none' }} />
                                    {imagePreview ? (
                                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                                            <img src={imagePreview} alt="preview"
                                                style={{ maxWidth: 320, maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                                            <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                                                style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#FF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => fileRef.current?.click()}
                                            style={{ display: 'block', width: '100%', padding: '16px', borderRadius: 10, background: 'rgba(0,212,255,0.05)', border: `1.5px dashed ${C.blue}`, color: C.blue, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                                            📸 Click to upload ad image (JPEG/PNG/WebP/GIF, max 5 MB)
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button onClick={() => setIsActive(v => !v)}
                                        style={{ width: 44, height: 24, borderRadius: 12, background: isActive ? C.green : 'rgba(255,255,255,0.1)', padding: 2, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block', transform: isActive ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                                    </button>
                                    <span style={{ fontSize: 13, color: isActive ? C.green : C.muted, fontWeight: 600 }}>
                                        {isActive ? '✓ Active — will show to users' : 'Inactive — hidden from users'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button onClick={resetForm}
                                        style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Cancel</button>
                                    <button onClick={handleCreate} disabled={saving || !imageFile}
                                        style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', cursor: saving || !imageFile ? 'not-allowed' : 'pointer', background: imageFile ? '#00e599' : 'rgba(255,255,255,0.05)', color: imageFile ? '#0a0a0a' : C.muted, fontWeight: 800, fontSize: 14, fontFamily: 'Inter, sans-serif', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}>
                                        {saving ? '⏳ Saving…' : '📢 Create Advertisement'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Ad list */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Loading…</div>
                ) : ads.length === 0 ? (
                    <div style={{ ...cardStyle, padding: 48, textAlign: 'center', color: C.muted }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No advertisements yet</div>
                        <div style={{ fontSize: 13 }}>Create an ad above — it will pop up for users when they visit the site.</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                        {ads.map(ad => (
                            <motion.div key={ad.id} layout style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                                {/* Image */}
                                <div style={{ position: 'relative' }}>
                                    <img src={`${API_URL}${ad.image_url}`} alt={ad.title || 'Ad'}
                                        style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                                    <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: ad.is_active ? 'rgba(0,229,153,0.9)' : 'rgba(255,68,68,0.9)', color: '#0a0a0a' }}>
                                        {ad.is_active ? '● ACTIVE' : '○ INACTIVE'}
                                    </div>
                                </div>
                                {/* Meta */}
                                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {ad.title && <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Outfit, sans-serif' }}>{ad.title}</div>}
                                    {ad.link_url && (
                                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize: 12, color: C.blue, wordBreak: 'break-all', textDecoration: 'none' }}>
                                            🔗 {ad.link_url}
                                        </a>
                                    )}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                        <button onClick={() => toggleActive(ad)}
                                            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: ad.is_active ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,136,0.1)', color: ad.is_active ? '#FF6B6B' : C.green, fontWeight: 700, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                                            {ad.is_active ? '⏸ Deactivate' : '▶ Activate'}
                                        </button>
                                        <button onClick={() => handleDelete(ad.id)} disabled={deleting === ad.id}
                                            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,68,68,0.08)', color: '#FF6B6B', fontWeight: 700, fontSize: 12, fontFamily: 'Inter, sans-serif', opacity: deleting === ad.id ? 0.5 : 1 }}>
                                            {deleting === ad.id ? '…' : '🗑'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
