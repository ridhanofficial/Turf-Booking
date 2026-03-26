'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminUploadTurfImage } from '@/lib/api';
import {
    C, cardStyle, inputStyle, labelStyle, btnNeon,
    FACILITY_OPTIONS, FACILITY_LABELS, FACILITY_EMOJIS, AMENITY_OPTIONS,
    Turf, EMPTY_TURF,
} from './admin-styles';

export interface PricingRuleForm {
    id?: number;           // only set for existing rules (when editing)
    start_time: string;    // "HH:MM"
    end_time: string;      // "HH:MM"
    price: string;         // user-typed, converted to number on save
    day_type: 'all' | 'weekday' | 'weekend';
}

interface TurfDrawerProps {
    open: boolean;
    onClose: () => void;
    editingTurf: Turf | null;
    turfForm: typeof EMPTY_TURF;
    setTurfForm: React.Dispatch<React.SetStateAction<typeof EMPTY_TURF>>;
    saving: boolean;
    onSave: () => void;
    onTurfsUpdated: () => void;
    pendingImageFile: File | null;
    setPendingImageFile: (f: File | null) => void;
    pendingImagePreview: string | null;
    setPendingImagePreview: (p: string | null) => void;
    pricingRules: PricingRuleForm[];
    setPricingRules: React.Dispatch<React.SetStateAction<PricingRuleForm[]>>;
}

const DAY_TYPE_OPTIONS: { value: PricingRuleForm['day_type']; label: string }[] = [
    { value: 'all', label: 'All Days' },
    { value: 'weekday', label: 'Weekdays' },
    { value: 'weekend', label: 'Weekends' },
];

// ─── Time utilities ────────────────────────────────────────────────────────────

/**
 * Generates an array of "HH:MM" strings in 30-minute increments
 * covering the full day (00:00 → 23:30).
 */
const ALL_TIMES: string[] = (() => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (const m of [0, 30]) {
            times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return times;
})();

/** Format "HH:MM" → "6:00 AM" / "11:30 PM" for display labels */
function formatTime12h(hhmm: string): string {
    if (!hhmm) return '';
    const [hStr, mStr] = hhmm.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr;
    const suffix = h < 12 ? 'AM' : 'PM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${m} ${suffix}`;
}

/**
 * A replacement for <input type="time"> that renders as a <select> so the options
 * are strictly filtered — the browser OS picker cannot bypass the constraint.
 *
 * @param minTime    Only include times >= this value (inclusive lower bound)
 * @param afterTime  Only include times strictly AFTER this value (exclusive lower bound)
 * @param fromTime   Alias of afterTime — used semantically for "TO" pickers
 * @param upToTime   Only include times up to and including this value (inclusive upper bound)
 */
function TimeSelect({
    value,
    onChange,
    placeholder = '— select —',
    minTime,
    afterTime,
    fromTime,
    upToTime,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    minTime?: string;    // inclusive lower bound (t >= minTime)
    afterTime?: string;  // exclusive lower bound (t > afterTime)
    fromTime?: string;   // alias of afterTime for "TO" pickers
    upToTime?: string;   // inclusive upper bound (t <= upToTime)
    disabled?: boolean;
}) {
    const exclusiveLower = afterTime || fromTime || null;

    const options = ALL_TIMES.filter(t => {
        if (minTime && t < minTime) return false;
        if (exclusiveLower && t <= exclusiveLower) return false;
        if (upToTime && t > upToTime) return false;
        return true;
    });

    const isInvalid = !!value && !options.includes(value);

    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            style={{
                ...inputStyle,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                borderColor: isInvalid ? '#FF4444' : undefined,
            }}
        >
            <option value="" style={{ background: '#131920' }}>{placeholder}</option>
            {options.map(t => (
                <option key={t} value={t} style={{ background: '#131920' }}>
                    {formatTime12h(t)}
                </option>
            ))}
        </select>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TurfDrawer({
    open, onClose, editingTurf, turfForm, setTurfForm,
    saving, onSave, onTurfsUpdated,
    pendingImageFile, setPendingImageFile, pendingImagePreview, setPendingImagePreview,
    pricingRules, setPricingRules,
}: TurfDrawerProps) {
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleAmenity = (a: string) =>
        setTurfForm(f => ({
            ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
        }));

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5 MB');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        if (!editingTurf) {
            setPendingImageFile(file);
            setPendingImagePreview(URL.createObjectURL(file));
            return;
        }
        setUploadingImage(true);
        try {
            await adminUploadTurfImage(editingTurf.id, file);
            toast.success('Image uploaded!');
            onTurfsUpdated();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Upload failed');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Operating-hours change handlers ──────────────────────────────────────

    const handleStartTimeChange = (newStart: string) => {
        setTurfForm(f => ({
            ...f,
            operating_start_time: newStart,
            // If closing time is now <= new opening time, clear it
            operating_end_time: f.operating_end_time && f.operating_end_time <= newStart
                ? ''
                : f.operating_end_time,
        }));
        // Cascade: clamp any peak-hour rules that now fall outside the new start
        setPricingRules(rules => rules.map(r => ({
            ...r,
            start_time: r.start_time && r.start_time <= newStart ? '' : r.start_time,
            end_time: r.end_time && r.end_time <= newStart ? '' : r.end_time,
        })));
    };

    const handleEndTimeChange = (newEnd: string) => {
        setTurfForm(f => ({ ...f, operating_end_time: newEnd }));
        // Cascade: clamp peak-hour rules whose end exceeds new closing time
        setPricingRules(rules => rules.map(r => ({
            ...r,
            end_time: r.end_time && r.end_time > newEnd ? '' : r.end_time,
            start_time: r.start_time && r.start_time >= newEnd ? '' : r.start_time,
        })));
    };

    // ── Peak-hour rule helpers ────────────────────────────────────────────────

    const addRule = () =>
        setPricingRules(r => [
            ...r,
            {
                start_time: turfForm.operating_start_time || '06:00',
                end_time: turfForm.operating_end_time || '22:00',
                price: '',
                day_type: 'all',
            },
        ]);

    const removeRule = (idx: number) =>
        setPricingRules(r => r.filter((_, i) => i !== idx));

    const updateRuleStartTime = (idx: number, newStart: string) => {
        setPricingRules(r => r.map((row, i) => {
            if (i !== idx) return row;
            return {
                ...row,
                start_time: newStart,
                // Clear end_time if it would now be <= new start
                end_time: row.end_time && row.end_time <= newStart ? '' : row.end_time,
            };
        }));
    };

    const updateRuleEndTime = (idx: number, newEnd: string) => {
        setPricingRules(r => r.map((row, i) =>
            i === idx ? { ...row, end_time: newEnd } : row
        ));
    };

    const updateRule = (idx: number, patch: Partial<PricingRuleForm>) =>
        setPricingRules(r => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

    // ─────────────────────────────────────────────────────────────────────────

    const opStart = turfForm.operating_start_time;
    const opEnd = turfForm.operating_end_time;

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, zIndex: 200, background: C.overlay, backdropFilter: 'blur(4px)' }} />
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 560, background: '#0D1117', borderLeft: `1px solid ${C.border}`, overflowY: 'auto', padding: '32px 28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                            <div>
                                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
                                    {editingTurf ? '✏️ Edit Turf' : '+ New Turf'}
                                </h2>
                                <p style={{ color: C.muted, fontSize: 13 }}>
                                    {editingTurf ? 'Update turf details' : 'New turf will appear on the customer portal immediately'}
                                </p>
                            </div>
                            <button onClick={onClose}
                                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                            {/* Name */}
                            <div>
                                <label style={labelStyle}>Turf Name *</label>
                                <input type="text" placeholder="e.g. Green Arena" value={turfForm.name}
                                    onChange={e => setTurfForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
                            </div>

                            {/* Facility Type */}
                            <div>
                                <label style={labelStyle}>Facility Type *</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {FACILITY_OPTIONS.map(s => (
                                        <button key={s} onClick={() => setTurfForm(f => ({
                                            ...f,
                                            facility_type: s,
                                            bowling_machine_price: (s === 'net_normal' || s === 'net_cement') ? f.bowling_machine_price : '',
                                        }))}
                                            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: turfForm.facility_type === s ? C.blue : C.card, color: turfForm.facility_type === s ? '#0a0a0a' : C.muted, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                                            {FACILITY_EMOJIS[s]} {FACILITY_LABELS[s]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea placeholder="Short description for customers…" value={turfForm.description}
                                    onChange={e => setTurfForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                            </div>

                            {/* ── Operating Hours ──────────────────────────────────────── */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Opens At *</label>
                                    {/* Opening time: full day, no restriction */}
                                    <TimeSelect
                                        value={opStart}
                                        onChange={handleStartTimeChange}
                                        placeholder="— select —"
                                        upToTime="23:00"
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Closes At *</label>
                                    {/* Closing time: only times STRICTLY AFTER opening time */}
                                    <TimeSelect
                                        value={opEnd}
                                        onChange={handleEndTimeChange}
                                        placeholder={opStart ? '— select —' : '— pick opening first —'}
                                        afterTime={opStart || undefined}
                                        disabled={!opStart}
                                    />
                                    {opStart && !opEnd && (
                                        <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 4 }}>
                                            ⚠ Choose a closing time after {formatTime12h(opStart)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Slot size + Price */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Slot Size (min)</label>
                                    <select value={turfForm.slot_duration_minutes}
                                        onChange={e => setTurfForm(f => ({ ...f, slot_duration_minutes: Number(e.target.value) }))}
                                        style={{ ...inputStyle, cursor: 'pointer' }}>
                                        {[30, 45, 60, 90, 120].map(n => <option key={n} value={n} style={{ background: '#131920' }}>{n} min</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Base Price (₹) *</label>
                                    <input type="number" min={0} placeholder="e.g. 500" value={turfForm.base_price}
                                        onChange={e => setTurfForm(f => ({ ...f, base_price: e.target.value }))} style={inputStyle} />
                                </div>
                            </div>

                            {/* ── Peak-Hour Pricing ──────────────────────────────────────── */}
                            <div style={{ borderRadius: 12, border: `1px solid rgba(255,215,0,0.18)`, background: 'rgba(255,215,0,0.03)', padding: '16px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#FFD700', fontFamily: 'Outfit, sans-serif' }}>
                                            ⏰ Peak-Hour Pricing
                                        </div>
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                            Slots in these intervals will use this price instead of base price
                                        </div>
                                    </div>
                                    <button
                                        onClick={addRule}
                                        disabled={!opStart || !opEnd}
                                        title={!opStart || !opEnd ? 'Set operating hours first' : undefined}
                                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,215,0,0.35)', background: 'rgba(255,215,0,0.08)', color: !opStart || !opEnd ? C.muted : '#FFD700', cursor: !opStart || !opEnd ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', opacity: !opStart || !opEnd ? 0.5 : 1 }}>
                                        + Add Interval
                                    </button>
                                </div>

                                {/* Operating window hint */}
                                {opStart && opEnd ? (
                                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                                        🕐 Intervals must be within{' '}
                                        <strong style={{ color: '#F0F4F8' }}>{formatTime12h(opStart)} – {formatTime12h(opEnd)}</strong>
                                        {' '}(only valid times are shown in dropdowns)
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 11, color: '#FF6B6B', marginBottom: 10 }}>
                                        ⚠ Set operating hours above before adding peak-hour intervals
                                    </div>
                                )}

                                {pricingRules.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: C.muted }}>
                                        No peak-hour rules — all slots use base price
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {/* Column headers */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 100px 32px', gap: 8 }}>
                                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>FROM</div>
                                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>TO</div>
                                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>PRICE ₹</div>
                                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>APPLIES TO</div>
                                            <div />
                                        </div>

                                        {pricingRules.map((rule, idx) => {
                                            const toOptions_afterTime = rule.start_time || opStart || undefined;
                                            const hasError = rule.start_time && rule.end_time && rule.end_time <= rule.start_time;
                                            // Peak FROM: selectable range is [opStart, opEnd) — can start at open but not at close
                                            // Peak TO:   selectable range is (rule.start_time, opEnd] — must end after FROM, up to close
                                            return (
                                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 100px 32px', gap: 8, alignItems: 'center' }}>
                                                        {/* FROM: starts at opStart (inclusive), must be before opEnd */}
                                                        <TimeSelect
                                                            value={rule.start_time}
                                                            onChange={v => updateRuleStartTime(idx, v)}
                                                            placeholder="— from —"
                                                            minTime={opStart || undefined}
                                                            upToTime={opEnd
                                                                ? ALL_TIMES[ALL_TIMES.indexOf(opEnd) - 1] ?? opEnd
                                                                : undefined
                                                            }
                                                            disabled={!opStart || !opEnd}
                                                        />
                                                        {/* TO: strictly after FROM, up to opEnd (inclusive) */}
                                                        <TimeSelect
                                                            value={rule.end_time}
                                                            onChange={v => updateRuleEndTime(idx, v)}
                                                            placeholder="— to —"
                                                            fromTime={toOptions_afterTime}
                                                            upToTime={opEnd || undefined}
                                                            disabled={!rule.start_time}
                                                        />
                                                        {/* Price */}
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            placeholder="₹"
                                                            value={rule.price}
                                                            onChange={e => updateRule(idx, { price: e.target.value })}
                                                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                                                        />
                                                        {/* Day type */}
                                                        <select
                                                            value={rule.day_type}
                                                            onChange={e => updateRule(idx, { day_type: e.target.value as PricingRuleForm['day_type'] })}
                                                            style={{ ...inputStyle, padding: '8px 8px', fontSize: 12, cursor: 'pointer' }}>
                                                            {DAY_TYPE_OPTIONS.map(o => (
                                                                <option key={o.value} value={o.value} style={{ background: '#131920' }}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                        {/* Remove */}
                                                        <button onClick={() => removeRule(idx)}
                                                            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.08)', color: '#FF4444', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            ✕
                                                        </button>
                                                    </div>
                                                    {hasError && (
                                                        <div style={{ fontSize: 11, color: '#FF6B6B', paddingLeft: 2 }}>
                                                            ⚠ "To" time must be after "From" time
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {pricingRules.length > 0 && (
                                    <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 11, color: C.muted }}>
                                        💡 Slots <strong style={{ color: '#F0F4F8' }}>outside</strong> these intervals use the base price of ₹{turfForm.base_price || '—'}
                                    </div>
                                )}
                            </div>

                            {/* Bowling machine price (nets only) + Advance payment */}
                            {(turfForm.facility_type === 'net_normal' || turfForm.facility_type === 'net_cement') ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={labelStyle}>Bowling Machine Price (₹)</label>
                                        <input type="number" min={0} placeholder="e.g. 200" value={turfForm.bowling_machine_price}
                                            onChange={e => setTurfForm(f => ({ ...f, bowling_machine_price: e.target.value }))} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Advance Payment (₹)</label>
                                        <input type="number" min={0} placeholder="Leave blank to disable"
                                            value={turfForm.advance_payment_amount}
                                            onChange={e => setTurfForm(f => ({ ...f, advance_payment_amount: e.target.value }))} style={inputStyle} />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label style={labelStyle}>Advance Payment (₹)</label>
                                    <input type="number" min={0} placeholder="Leave blank to disable"
                                        value={turfForm.advance_payment_amount}
                                        onChange={e => setTurfForm(f => ({ ...f, advance_payment_amount: e.target.value }))} style={inputStyle} />
                                </div>
                            )}
                            {turfForm.advance_payment_amount !== '' && Number(turfForm.advance_payment_amount) > 0 && (
                                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', fontSize: 12, color: '#8B9CB0' }}>
                                    ⚡ Customers will be offered to pay <strong style={{ color: '#FFD700' }}>₹{turfForm.advance_payment_amount}</strong> as advance now and the remainder at the venue.
                                </div>
                            )}

                            {/* Amenities */}
                            <div>
                                <label style={labelStyle}>Amenities</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {AMENITY_OPTIONS.map(a => {
                                        const checked = turfForm.amenities.includes(a);
                                        return (
                                            <button key={a} onClick={() => toggleAmenity(a)}
                                                style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', border: 'none', background: checked ? 'rgba(0,255,136,0.12)' : C.card, color: checked ? C.green : C.muted, outline: checked ? `1px solid rgba(0,255,136,0.3)` : `1px solid ${C.border}` }}>
                                                {checked ? '✓ ' : ''}{a}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Image upload */}
                            <div>
                                <label style={labelStyle}>Turf Photo</label>
                                {editingTurf && editingTurf.image_urls && editingTurf.image_urls.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                                        {editingTurf.image_urls.map((url, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                                                <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}`}
                                                    alt={`Turf image ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!editingTurf && pendingImagePreview && (
                                    <div style={{ marginBottom: 12, position: 'relative', display: 'inline-block' }}>
                                        <img src={pendingImagePreview} alt="Preview"
                                            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                                        <button
                                            onClick={() => { setPendingImageFile(null); setPendingImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#FF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                                        >✕</button>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                                    onChange={handleImageUpload} style={{ display: 'none' }} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage}
                                    style={{ padding: '10px 16px', borderRadius: 10, background: pendingImageFile ? 'rgba(0,255,136,0.06)' : 'rgba(0,212,255,0.06)', border: `1px dashed ${pendingImageFile ? C.green : C.blue}`, color: pendingImageFile ? C.green : C.blue, cursor: uploadingImage ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, width: '100%', opacity: uploadingImage ? 0.6 : 1 }}
                                >
                                    {uploadingImage ? '⏳ Uploading…' : pendingImageFile ? '✅ Photo ready — tap to change' : '📸 Upload Photo (JPEG/PNG/WebP, max 5 MB)'}
                                </button>
                                {!editingTurf && (
                                    <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                                        Photo will be uploaded automatically after the turf is created.
                                    </p>
                                )}
                            </div>

                            {/* Live preview badge */}
                            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', fontSize: 13, color: C.muted }}>
                                🌐 <strong style={{ color: C.white }}>Live preview:</strong> Once saved, this turf will be available on{' '}
                                <a href="/turfs" target="_blank" style={{ color: C.blue }}>the customer booking portal</a> immediately.
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={onClose}
                                    style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                                    Cancel
                                </button>
                                <button onClick={onSave} disabled={saving}
                                    style={{ ...btnNeon, flex: 2, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'Saving…' : editingTurf ? '✓ Save Changes' : '🏟️ Create Turf'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
