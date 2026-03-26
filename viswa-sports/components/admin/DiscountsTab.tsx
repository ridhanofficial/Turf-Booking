'use client';
import { motion } from 'framer-motion';
import { C, cardStyle, Discount, EMPTY_DISCOUNT } from './admin-styles';

interface DiscountsTabProps {
    discounts: Discount[];
    onAddDiscount: () => void;
    onToggleDiscount: (d: Discount) => void;
    onDeleteDiscount: (id: number) => void;
}

export default function DiscountsTab({ discounts, onAddDiscount, onToggleDiscount, onDeleteDiscount }: DiscountsTabProps) {
    return (
        <motion.div key="discounts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button onClick={onAddDiscount}
                    style={{ background: 'linear-gradient(135deg,#FFD700,#CC9900)', color: '#0B0F14', fontWeight: 700, padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'Inter, sans-serif', boxShadow: '0 0 16px rgba(255,215,0,0.3)' }}>
                    + Add Discount
                </button>
            </div>

            {discounts.length === 0 ? (
                <div style={{ ...cardStyle, padding: 64, textAlign: 'center' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🏷️</div>
                    <h3 style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 8 }}>No discounts yet</h3>
                    <p style={{ color: C.muted, marginBottom: 24 }}>Create a discount code to offer customers a deal.</p>
                </div>
            ) : (
                <div style={{ ...cardStyle, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                {['Code', 'Type', 'Value', 'Min Slots', 'Valid From', 'Valid To', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {discounts.map((d, i) => (
                                <tr key={d.id} style={{ borderBottom: i < discounts.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '14px 16px', fontWeight: 700, color: C.yellow, fontFamily: 'monospace', fontSize: 13 }}>
                                        {d.code || <span style={{ color: C.muted, fontWeight: 400, fontFamily: 'Inter, sans-serif' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '14px 16px', color: C.muted, fontSize: 13, textTransform: 'capitalize' }}>{d.type}</td>
                                    <td style={{ padding: '14px 16px', fontWeight: 700, color: C.green, fontSize: 13 }}>
                                        {d.type === 'percent' ? `${d.value}%` : `₹${d.value}`}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontSize: 13 }}>
                                        {d.min_slots ? (
                                            <span style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', color: C.yellow, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                                                ≥{d.min_slots} slots
                                            </span>
                                        ) : (
                                            <span style={{ color: C.muted, fontSize: 12 }}>Any</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '14px 16px', color: C.muted, fontSize: 12 }}>{d.valid_from}</td>
                                    <td style={{ padding: '14px 16px', color: C.muted, fontSize: 12 }}>{d.valid_to}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <button onClick={() => onToggleDiscount(d)} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: d.is_active ? 'rgba(0,255,136,0.12)' : 'rgba(255,68,68,0.12)', color: d.is_active ? C.green : C.red }}>
                                            {d.is_active ? '● Active' : '○ Inactive'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <button onClick={() => onDeleteDiscount(d.id)} style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', color: C.red, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    );
}
