'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { C, cardStyle, inputStyle, labelStyle, btnNeon, Turf } from './admin-styles';
import { adminGetSlots, adminBlockSlots, adminGenerateSlotsBulk } from '@/lib/api';

interface Slot {
    id: number;
    start_time: string;
    end_time: string;
    status: 'available' | 'held' | 'booked' | 'disabled';
    price: number;
}

interface SlotsTabProps {
    turfs: Turf[];
    slotTurfId: string;
    setSlotTurfId: (v: string) => void;
    slotStartDate: string;
    setSlotStartDate: (v: string) => void;
    slotDays: number;
    setSlotDays: (v: number) => void;
    slotGenerating: boolean;
    onGenerate: () => void;
}

const slotColor = {
    available: { bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)', color: '#00FF88' },
    booked: { bg: 'rgba(0,229,153,0.08)', border: 'rgba(0,229,153,0.2)', color: '#00e599' },
    held: { bg: 'rgba(255,196,0,0.08)', border: 'rgba(255,196,0,0.2)', color: '#FFC400' },
    disabled: { bg: 'rgba(255,68,68,0.08)', border: 'rgba(255,68,68,0.2)', color: '#FF6B6B' },
};

export default function SlotsTab({
    turfs, slotTurfId, setSlotTurfId, slotStartDate, setSlotStartDate,
    slotDays, setSlotDays, slotGenerating, onGenerate,
}: SlotsTabProps) {
    // Block panel state
    const [blockTurfId, setBlockTurfId] = useState('');
    const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [blocking, setBlocking] = useState(false);

    const loadSlots = async () => {
        if (!blockTurfId || !blockDate) return;
        setLoadingSlots(true);
        setSelectedIds(new Set());
        try {
            const res = await adminGetSlots(Number(blockTurfId), blockDate);
            setSlots(res.data);
        } catch { toast.error('Failed to load slots'); }
        finally { setLoadingSlots(false); }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleBlock = async (action: 'block' | 'unblock') => {
        if (!selectedIds.size) { toast.error('Select at least one slot'); return; }
        setBlocking(true);
        try {
            const res = await adminBlockSlots({
                turf_id: Number(blockTurfId),
                date: blockDate,
                slot_ids: Array.from(selectedIds),
                action,
            });
            const d = res.data;
            toast.success(`${d.changed} slot${d.changed !== 1 ? 's' : ''} ${action === 'block' ? 'blocked' : 'unblocked'}${d.skipped ? ` (${d.skipped} skipped — already booked)` : ''}`, { duration: 4000 });
            await loadSlots();
        } catch (err: any) { toast.error(err?.response?.data?.detail || `${action} failed`); }
        finally { setBlocking(false); }
    };

    const blockableSelected = slots.filter(s => selectedIds.has(s.id) && s.status === 'available').length;
    const unblockableSelected = slots.filter(s => selectedIds.has(s.id) && s.status === 'disabled').length;

    return (
        <motion.div key="slots" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* ── Block/Unblock slots panel ── */}
                <div style={{ ...cardStyle, padding: 28 }}>
                    <div style={{ fontWeight: 800, fontSize: 17, fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>
                        🚫 Block / Unblock Slots
                    </div>
                    <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>
                        Select a turf and date, load slots, then click to select which ones to block or unblock. Booked/held slots are protected.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'flex-end', marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Turf</label>
                            <select value={blockTurfId} onChange={e => setBlockTurfId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                <option value="">Choose a turf…</option>
                                {turfs.map(t => <option key={t.id} value={t.id} style={{ background: '#131920' }}>{t.name} (#{t.id})</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Date</label>
                            <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                        </div>
                        <button onClick={loadSlots} disabled={!blockTurfId || loadingSlots}
                            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', cursor: !blockTurfId || loadingSlots ? 'not-allowed' : 'pointer', background: 'rgba(0,229,153,0.1)', color: C.blue, fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif', opacity: !blockTurfId ? 0.5 : 1 }}>
                            {loadingSlots ? '⏳ Loading…' : '📋 Load Slots'}
                        </button>
                    </div>

                    {/* Slot grid */}
                    {slots.length > 0 && (
                        <>
                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                                {(['available', 'booked', 'held', 'disabled'] as const).map(s => (
                                    <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: slotColor[s].bg, color: slotColor[s].color, border: `1px solid ${slotColor[s].border}` }}>
                                        {s === 'available' ? '✓ Available' : s === 'booked' ? '● Booked' : s === 'held' ? '⏳ Held' : '✗ Blocked'}
                                    </span>
                                ))}
                                <span style={{ fontSize: 11, padding: '3px 9px', background: 'rgba(0,229,153,0.1)', borderRadius: 5, border: '1px solid rgba(0,229,153,0.25)', color: C.blue }}>
                                    □ Selected
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 18 }}>
                                {slots.map(slot => {
                                    const isSelected = selectedIds.has(slot.id);
                                    const sc = slotColor[slot.status];
                                    const isClickable = slot.status === 'available' || slot.status === 'disabled';
                                    return (
                                        <button
                                            key={slot.id}
                                            onClick={() => isClickable && toggleSelect(slot.id)}
                                            title={isClickable ? `Click to select · ${slot.status}` : `${slot.status} — cannot be changed`}
                                            style={{
                                                padding: '8px 6px', borderRadius: 8,
                                                background: isSelected ? 'rgba(0,229,153,0.12)' : sc.bg,
                                                border: `2px solid ${isSelected ? C.blue : sc.border}`,
                                                color: isSelected ? C.blue : sc.color,
                                                cursor: isClickable ? 'pointer' : 'not-allowed',
                                                fontFamily: 'Inter, sans-serif',
                                                fontSize: 12, fontWeight: 700,
                                                transition: 'all 0.15s',
                                                opacity: isClickable ? 1 : 0.5,
                                            }}>
                                            {slot.start_time.slice(0, 5)}<br />
                                            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>{slot.end_time.slice(0, 5)}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: C.muted }}>
                                    {selectedIds.size} slot{selectedIds.size !== 1 ? 's' : ''} selected
                                </span>
                                <button onClick={() => handleBlock('block')} disabled={blocking || blockableSelected === 0}
                                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: blocking || blockableSelected === 0 ? 'not-allowed' : 'pointer', background: blockableSelected > 0 ? 'rgba(255,68,68,0.15)' : 'rgba(255,255,255,0.04)', color: blockableSelected > 0 ? '#FF6B6B' : C.muted, fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif', opacity: blocking ? 0.6 : 1 }}>
                                    🚫 Block {blockableSelected > 0 ? `(${blockableSelected})` : ''}
                                </button>
                                <button onClick={() => handleBlock('unblock')} disabled={blocking || unblockableSelected === 0}
                                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: blocking || unblockableSelected === 0 ? 'not-allowed' : 'pointer', background: unblockableSelected > 0 ? 'rgba(0,229,153,0.1)' : 'rgba(255,255,255,0.04)', color: unblockableSelected > 0 ? '#00e599' : C.muted, fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif', opacity: blocking ? 0.6 : 1 }}>
                                    ✓ Unblock {unblockableSelected > 0 ? `(${unblockableSelected})` : ''}
                                </button>
                                <button onClick={() => setSelectedIds(new Set())} style={{ padding: '9px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                                    Clear
                                </button>
                            </div>
                        </>
                    )}

                    {slots.length === 0 && !loadingSlots && blockTurfId && (
                        <div style={{ textAlign: 'center', padding: '28px 0', color: C.muted, fontSize: 13 }}>
                            No slots found for this date. Generate slots first using the panel below.
                        </div>
                    )}
                </div>

                {/* ── Generate slots panel ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                    <div style={{ ...cardStyle, padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, fontFamily: 'Outfit, sans-serif', marginBottom: -8 }}>📅 Generate Slots</div>
                        <div>
                            <label style={labelStyle}>Turf</label>
                            <select value={slotTurfId} onChange={e => setSlotTurfId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                <option value="">Choose a turf…</option>
                                {turfs.map(t => <option key={t.id} value={t.id} style={{ background: '#131920' }}>{t.name} (#{t.id})</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Start Date</label>
                            <input type="date" value={slotStartDate} onChange={e => setSlotStartDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Days — <span style={{ color: C.blue, fontWeight: 800 }}>{slotDays}</span></label>
                            <input type="range" min={1} max={365} value={slotDays} onChange={e => setSlotDays(Number(e.target.value))} style={{ width: '100%', accentColor: C.blue, cursor: 'pointer', marginBottom: 6 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted }}><span>1</span><span>365</span></div>
                        </div>
                        <button onClick={onGenerate} disabled={!slotTurfId || slotGenerating}
                            style={{ ...btnNeon, opacity: !slotTurfId || slotGenerating ? 0.5 : 1, cursor: !slotTurfId || slotGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            📅 {slotGenerating ? 'Generating…' : `Generate ${slotDays} Day${slotDays > 1 ? 's' : ''} of Slots`}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { icon: '🤖', title: 'Auto-Scheduler', body: 'The backend auto-generates slots for the next 30 days daily on startup. Manual generation is only needed to seed further ahead.' },
                            { icon: '♻️', title: 'Idempotent', body: 'Running generation multiple times is safe — dates that already have slots are skipped automatically.' },
                            { icon: '🚫', title: 'Slot Blocking', body: 'Use the panel above to block specific time slots on a date. Blocked slots cannot be booked by customers. Booked/held slots are protected from accidental blocking.' },
                        ].map(c => (
                            <div key={c.title} style={{ ...cardStyle, padding: 20 }}>
                                <div style={{ fontSize: 20, marginBottom: 8 }}>{c.icon}</div>
                                <h3 style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 8, fontSize: 15 }}>{c.title}</h3>
                                <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7 }}>{c.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
