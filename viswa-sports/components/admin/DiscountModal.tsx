
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { C, cardStyle, inputStyle, labelStyle, EMPTY_DISCOUNT } from './admin-styles';

interface DiscountModalProps {
    open: boolean;
    onClose: () => void;
    discountForm: typeof EMPTY_DISCOUNT;
    setDiscountForm: React.Dispatch<React.SetStateAction<typeof EMPTY_DISCOUNT>>;
    savingDiscount: boolean;
    onSave: () => void;
}

export default function DiscountModal({ open, onClose, discountForm, setDiscountForm, savingDiscount, onSave }: DiscountModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 200,
                        background: C.overlay, backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '24px',
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: 480, background: '#0D1117', borderRadius: 20, border: `1px solid rgba(255,215,0,0.15)`, padding: '32px 28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 20 }}>🏷️ New Discount</h2>
                            <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Coupon Code */}
                            <div>
                                <label style={labelStyle}>Discount Code</label>
                                <input type="text" placeholder="e.g. SAVE20 (leave blank for auto)" value={discountForm.code}
                                    onChange={e => setDiscountForm(f => ({ ...f, code: e.target.value }))} style={inputStyle} />
                            </div>

                            {/* Type + Value */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Type</label>
                                    <select value={discountForm.type} onChange={e => setDiscountForm(f => ({ ...f, type: e.target.value as 'flat' | 'percent' }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option value="percent" style={{ background: '#131920' }}>Percent (%)</option>
                                        <option value="flat" style={{ background: '#131920' }}>Flat (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Value</label>
                                    <input type="number" min={0} placeholder={discountForm.type === 'percent' ? 'e.g. 10' : 'e.g. 100'} value={discountForm.value}
                                        onChange={e => setDiscountForm(f => ({ ...f, value: e.target.value }))} style={inputStyle} />
                                </div>
                            </div>

                            {/* Valid dates */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Valid From</label>
                                    <input type="date" value={discountForm.valid_from} onChange={e => setDiscountForm(f => ({ ...f, valid_from: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Valid To</label>
                                    <input type="date" value={discountForm.valid_to} onChange={e => setDiscountForm(f => ({ ...f, valid_to: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
                                </div>
                            </div>

                            {/* Min Slots condition */}
                            <div>
                                <label style={labelStyle}>
                                    Min Slots Required
                                    <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', marginLeft: 6, fontSize: 10 }}>
                                        (optional — leave 0 for no restriction)
                                    </span>
                                </label>
                                <input
                                    type="number" min={0} placeholder="e.g. 3 — coupon requires booking ≥3 slots"
                                    value={discountForm.min_slots}
                                    onChange={e => setDiscountForm(f => ({ ...f, min_slots: e.target.value }))}
                                    style={inputStyle}
                                />
                                {discountForm.min_slots && Number(discountForm.min_slots) > 0 && (
                                    <p style={{ color: C.yellow, fontSize: 11, marginTop: 6 }}>
                                        ⚡ This coupon will only apply when user books <strong>{discountForm.min_slots}</strong> or more slots.
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Cancel</button>
                                <button onClick={onSave} disabled={savingDiscount}
                                    style={{ flex: 2, background: 'linear-gradient(135deg,#FFD700,#CC9900)', color: '#0B0F14', fontWeight: 700, padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'Outfit, sans-serif', boxShadow: '0 0 20px rgba(255,215,0,0.3)', opacity: savingDiscount ? 0.7 : 1 }}>
                                    {savingDiscount ? 'Creating…' : '🏷️ Create Discount'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
