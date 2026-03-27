'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    adminLogin, adminGetAnalytics, adminGetTurfs,
    adminCreateTurf, adminUpdateTurf, adminDeleteTurf, adminGenerateSlotsBulk,
    adminGetDiscounts, adminCreateDiscount, adminUpdateDiscount, adminDeleteDiscount,
    adminUploadTurfImage,
    adminGetPricingRules, adminCreatePricingRule, adminDeletePricingRule,
} from '@/lib/api';
import type { PricingRuleForm } from '@/components/admin/TurfDrawer';
import { C, Turf, Analytics, Discount, EMPTY_TURF, EMPTY_DISCOUNT } from '@/components/admin/admin-styles';
import AdminLogin from '@/components/admin/AdminLogin';
import DashboardTab from '@/components/admin/DashboardTab';
import TurfsTab from '@/components/admin/TurfsTab';
import SlotsTab from '@/components/admin/SlotsTab';
import DiscountsTab from '@/components/admin/DiscountsTab';
import BookingsTab from '@/components/admin/BookingsTab';
import TurfDrawer from '@/components/admin/TurfDrawer';
import DiscountModal from '@/components/admin/DiscountModal';
import AdsTab from '@/components/admin/AdsTab';

/* ─────────────────────────────────────────────────────────────────────────── */
function AdminPageContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam === 'turfs' ? 'Turfs'
        : tabParam === 'slots' ? 'Slots'
            : tabParam === 'discounts' ? 'Discounts'
                : tabParam === 'bookings' ? 'Bookings'
                    : tabParam === 'ads' ? 'Ads'
                        : 'Dashboard';

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [turfs, setTurfs] = useState<Turf[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);

    /* Turf modal */
    const [showTurfModal, setShowTurfModal] = useState(false);
    const [editingTurf, setEditingTurf] = useState<Turf | null>(null);
    const [turfForm, setTurfForm] = useState({ ...EMPTY_TURF });
    const [saving, setSaving] = useState(false);
    const [pricingRules, setPricingRules] = useState<PricingRuleForm[]>([]);

    /* Image upload */
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

    /* Slot generation */
    const [slotTurfId, setSlotTurfId] = useState('');
    const [slotStartDate, setSlotStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [slotDays, setSlotDays] = useState(30);
    const [slotGenerating, setSlotGenerating] = useState(false);

    /* Discount modal */
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountForm, setDiscountForm] = useState({ ...EMPTY_DISCOUNT });
    const [savingDiscount, setSavingDiscount] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('viswa_admin_token')) { setIsLoggedIn(true); loadData(); }
    }, []);

    const loadData = async () => {
        try {
            const [ar, tr, dr] = await Promise.all([
                adminGetAnalytics(), adminGetTurfs(), adminGetDiscounts(),
            ]);
            setAnalytics(ar.data);
            setTurfs(tr.data);
            setDiscounts(dr.data);
        } catch { }
    };

    const handleLogin = async () => {
        setLoginLoading(true);
        try {
            const res = await adminLogin(email, password);
            localStorage.setItem('viswa_admin_token', res.data.access_token);
            setIsLoggedIn(true); toast.success('Welcome, Admin!'); await loadData();
        } catch { toast.error('Invalid credentials'); }
        finally { setLoginLoading(false); }
    };

    /* ── Turf form ─────────────────────────────────────────────────────── */
    const openCreateModal = () => {
        setEditingTurf(null);
        setTurfForm({ ...EMPTY_TURF });
        setPendingImageFile(null);
        setPendingImagePreview(null);
        setPricingRules([]);
        setShowTurfModal(true);
    };
    const openEditModal = async (turf: Turf) => {
        setEditingTurf(turf);
        setTurfForm({
            name: turf.name, facility_type: turf.facility_type, description: turf.description || '',
            operating_start_time: turf.operating_start_time, operating_end_time: turf.operating_end_time,
            slot_duration_minutes: turf.slot_duration_minutes, base_price: String(turf.base_price),
            bowling_machine_price: turf.bowling_machine_price != null ? String(turf.bowling_machine_price) : '',
            advance_payment_amount: turf.advance_payment_amount != null ? String(turf.advance_payment_amount) : '',
            amenities: turf.amenities || [],
        });
        // Load existing pricing rules
        try {
            const pr = await adminGetPricingRules(turf.id);
            setPricingRules(
                (pr.data as any[]).map(r => ({
                    id: r.id,
                    start_time: r.start_time.slice(0, 5),  // "HH:MM"
                    end_time: r.end_time.slice(0, 5),
                    price: String(r.price),
                    day_type: r.day_type,
                }))
            );
        } catch { setPricingRules([]); }
        setShowTurfModal(true);
    };

    const handleSaveTurf = async () => {
        if (!turfForm.name.trim() || !turfForm.base_price) {
            toast.error('Name and base price are required'); return;
        }
        setSaving(true);
        try {
            const payload: any = {
                name: turfForm.name.trim(), facility_type: turfForm.facility_type,
                description: turfForm.description || null,
                operating_start_time: turfForm.operating_start_time + ':00',
                operating_end_time: turfForm.operating_end_time + ':00',
                slot_duration_minutes: Number(turfForm.slot_duration_minutes),
                base_price: Number(turfForm.base_price),
                amenities: turfForm.amenities, image_urls: [],
            };
            // Optional numeric fields — only include if set
            if (turfForm.bowling_machine_price !== '') payload.bowling_machine_price = Number(turfForm.bowling_machine_price);
            if (turfForm.advance_payment_amount !== '') payload.advance_payment_amount = Number(turfForm.advance_payment_amount);
            else payload.advance_payment_amount = null; // clear if blank

            // ── Valid pricing rules (rows with a price filled in) ────────────
            const validRules = pricingRules.filter(r => r.price !== '' && Number(r.price) > 0);

            let turfId: number;
            if (editingTurf) {
                await adminUpdateTurf(editingTurf.id, payload);
                turfId = editingTurf.id;
                toast.success('Turf updated!');
                // Delete all existing pricing rules then re-create
                const existing = await adminGetPricingRules(turfId);
                await Promise.all((existing.data as any[]).map(r => adminDeletePricingRule(r.id).catch(() => {})));
            } else {
                const res = await adminCreateTurf(payload);
                turfId = res.data.id;
                if (pendingImageFile) {
                    try {
                        await adminUploadTurfImage(turfId, pendingImageFile);
                        toast.success('🏟️ Turf created with image!');
                    } catch {
                        toast.success('🏟️ Turf created! (image upload failed — you can retry in Edit)');
                    } finally {
                        setPendingImageFile(null);
                        setPendingImagePreview(null);
                    }
                } else {
                    toast.success('🏟️ Turf created!');
                }
            }

            // Save pricing rules
            await Promise.all(
                validRules.map(r =>
                    adminCreatePricingRule({
                        turf_id: turfId,
                        start_time: r.start_time + ':00',
                        end_time: r.end_time + ':00',
                        price: Number(r.price),
                        day_type: r.day_type,
                    }).catch(() => {})
                )
            );
            if (validRules.length > 0) {
                toast.success(`💰 ${validRules.length} pricing interval${validRules.length > 1 ? 's' : ''} saved!`, { duration: 3000 });
            }

            // For NEW turfs: generate 7 days of slots NOW (after pricing rules exist in DB
            // so that peak-hour prices are correctly stamped on each slot)
            if (!editingTurf) {
                const today = new Date().toISOString().split('T')[0];
                try {
                    const r = await adminGenerateSlotsBulk({ turf_id: turfId, start_date: today, days: 7 });
                    const d = r.data;
                    toast.success(`✅ ${d.slots_created} slots generated for 7 days`, { duration: 4000 });
                } catch {
                    toast.error('⚠️ Turf created but slot generation failed — use the Slots tab to generate manually.');
                }
            } else if (validRules.length > 0) {
                // For EDITED turfs: existing slots may have stale prices — prompt admin
                toast('ℹ️ Pricing rules updated. Regenerate slots from the Slots tab for new prices to apply.', { duration: 6000 });
            }

            setShowTurfModal(false); await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Save failed');
        } finally { setSaving(false); }
    };

    /* ── Slot generation ───────────────────────────────────────────────── */
    const handleToggleStatus = async (turf: Turf) => {
        try {
            const newStatus = turf.status === 'active' ? 'inactive' : 'active';
            await adminUpdateTurf(turf.id, { status: newStatus });
            toast.success(`Turf ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            await loadData();
        } catch { toast.error('Status update failed'); }
    };

    const handleDeleteTurf = async (turf: Turf) => {
        try {
            await adminDeleteTurf(turf.id);
            toast.success(`🗑️ "${turf.name}" permanently deleted`);
            await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Delete failed');
        }
    };

    const handleGenerateSlots = async () => {
        if (!slotTurfId) return;
        setSlotGenerating(true);
        try {
            const res = await adminGenerateSlotsBulk({ turf_id: Number(slotTurfId), start_date: slotStartDate, days: slotDays });
            const d = res.data;
            toast.success(`✅ Created ${d.slots_created} slots across ${d.days_generated} days (${d.days_skipped} skipped)`, { duration: 5000 });
        } catch (err: any) { toast.error(err?.response?.data?.detail || 'Generation failed'); }
        finally { setSlotGenerating(false); }
    };

    /* ── Discounts ─────────────────────────────────────────────────────── */
    const handleSaveDiscount = async () => {
        if (!discountForm.value) { toast.error('Value is required'); return; }
        setSavingDiscount(true);
        try {
            const minSlots = discountForm.min_slots !== '' && Number(discountForm.min_slots) > 0
                ? Number(discountForm.min_slots)
                : null;
            await adminCreateDiscount({
                code: discountForm.code.trim().toUpperCase() || null,
                type: discountForm.type,
                value: Number(discountForm.value),
                valid_from: discountForm.valid_from,
                valid_to: discountForm.valid_to,
                is_active: true,
                min_slots: minSlots,
            });
            toast.success('🏷️ Discount created!');
            setShowDiscountModal(false);
            await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to create discount');
        } finally { setSavingDiscount(false); }
    };

    const handleToggleDiscount = async (d: Discount) => {
        try {
            await adminUpdateDiscount(d.id, { is_active: !d.is_active });
            toast.success(d.is_active ? 'Discount deactivated' : 'Discount activated');
            await loadData();
        } catch { toast.error('Update failed'); }
    };

    const handleDeleteDiscount = async (id: number) => {
        if (!window.confirm('Delete this discount?')) return;
        try {
            await adminDeleteDiscount(id);
            toast.success('Discount deleted');
            await loadData();
        } catch { toast.error('Delete failed'); }
    };

    /* ── LOGIN ─────────────────────────────────────────────────────────── */
    if (!isLoggedIn) {
        return <AdminLogin email={email} setEmail={setEmail} password={password} setPassword={setPassword} loginLoading={loginLoading} onLogin={handleLogin} />;
    }

    /* ── MAIN ─────────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: 'clamp(16px,4vw,32px) clamp(14px,4vw,24px) 80px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Page header */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 'clamp(20px,5vw,28px)', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 4 }}>
                    {activeTab === 'Dashboard' ? '📊 Dashboard'
                        : activeTab === 'Turfs' ? '🏟️ Turfs'
                            : activeTab === 'Slots' ? '📅 Slot Management'
                                : activeTab === 'Bookings' ? '📋 Bookings'
                                    : activeTab === 'Ads' ? '📢 Advertisements'
                                        : '🏷️ Discounts'}
                </h1>
                <p style={{ color: C.muted, fontSize: 14 }}>
                    {activeTab === 'Dashboard' && 'Revenue, bookings and activity overview'}
                    {activeTab === 'Turfs' && 'Create and manage turf facilities — changes appear instantly on the customer portal'}
                    {activeTab === 'Slots' && 'Generate slots and block specific time slots to prevent customer bookings'}
                    {activeTab === 'Bookings' && 'View all customer bookings with full customer details, slot times and payment info'}
                    {activeTab === 'Ads' && 'Create popup advertisements shown to customers when they visit the site'}
                    {activeTab === 'Discounts' && 'Create and manage discount codes for customer bookings'}
                </p>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'Dashboard' && <DashboardTab analytics={analytics} turfs={turfs} />}
                {activeTab === 'Turfs' && (
                    <TurfsTab turfs={turfs} onRefresh={loadData} onCreateTurf={openCreateModal}
                        onEditTurf={openEditModal} onToggleStatus={handleToggleStatus}
                        onDeleteTurf={handleDeleteTurf} />
                )}
                {activeTab === 'Slots' && (
                    <SlotsTab turfs={turfs} slotTurfId={slotTurfId} setSlotTurfId={setSlotTurfId}
                        slotStartDate={slotStartDate} setSlotStartDate={setSlotStartDate}
                        slotDays={slotDays} setSlotDays={setSlotDays}
                        slotGenerating={slotGenerating} onGenerate={handleGenerateSlots} />
                )}
                {activeTab === 'Bookings' && <BookingsTab turfs={turfs} />}
                {activeTab === 'Ads' && <AdsTab />}
                {activeTab === 'Discounts' && (
                    <DiscountsTab discounts={discounts}
                        onAddDiscount={() => { setDiscountForm({ ...EMPTY_DISCOUNT }); setShowDiscountModal(true); }}
                        onToggleDiscount={handleToggleDiscount} onDeleteDiscount={handleDeleteDiscount} />
                )}
            </AnimatePresence>

            <TurfDrawer open={showTurfModal} onClose={() => setShowTurfModal(false)}
                editingTurf={editingTurf} turfForm={turfForm} setTurfForm={setTurfForm}
                saving={saving} onSave={handleSaveTurf} onTurfsUpdated={loadData}
                pendingImageFile={pendingImageFile} setPendingImageFile={setPendingImageFile}
                pendingImagePreview={pendingImagePreview} setPendingImagePreview={setPendingImagePreview}
                pricingRules={pricingRules} setPricingRules={setPricingRules} />

            <DiscountModal open={showDiscountModal} onClose={() => setShowDiscountModal(false)}
                discountForm={discountForm} setDiscountForm={setDiscountForm}
                savingDiscount={savingDiscount} onSave={handleSaveDiscount} />
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: '#080C10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F0F4F8' }}>
                <div style={{ fontSize: 18, fontFamily: 'Outfit, sans-serif' }}>Loading admin…</div>
            </div>
        }>
            <AdminPageContent />
        </Suspense>
    );
}
