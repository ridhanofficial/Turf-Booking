/* ── Shared Admin Design Tokens, Types & Styles ──────────────────────────── */

export const C = {
    bg: '#000000', sidebar: '#050505', topbar: 'rgba(0,0,0,0.85)',
    card: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)',
    accent: '#00e599', green: '#00e599', yellow: '#FFD700', red: '#FF4444',
    muted: '#6B7A8D', white: '#F0F4F8', overlay: 'rgba(0,0,0,0.75)',
    blue: '#00e599',
    active: 'rgba(0,229,153,0.08)',
    activeBorder: 'rgba(0,229,153,0.3)',
};

export const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.5)',
};

export const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '12px 16px', color: '#F0F4F8', fontSize: 14,
    fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
    backdropFilter: 'blur(8px)',
};

export const labelStyle: React.CSSProperties = {
    display: 'block', color: C.muted, fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8,
};

export const btnNeon: React.CSSProperties = {
    background: '#00e599', color: '#000000',
    fontWeight: 700, padding: '13px 0', borderRadius: 12, border: 'none',
    cursor: 'pointer', fontSize: 14, fontFamily: 'Outfit, sans-serif',
    width: '100%', boxShadow: '0 0 20px rgba(0,229,153,0.25)',
};

export const FACILITY_OPTIONS = ['full_pitch', 'net_normal', 'net_cement'];
export const FACILITY_LABELS: Record<string, string> = {
    full_pitch: 'Full Turf Pitch',
    net_normal: 'Net — Normal Surface',
    net_cement: 'Net — Cement Surface',
};
export const FACILITY_EMOJIS: Record<string, string> = {
    full_pitch: '🏏',
    net_normal: '🥅',
    net_cement: '🥅',
};
export const AMENITY_OPTIONS = ['Parking', 'Changing Rooms', 'Floodlights', 'Water Supply', 'Washrooms', 'Cafeteria', 'First Aid', 'CCTV', 'Wi-Fi'];

/* ── Types ──────────────────────────────────────────────────────────────── */
export interface Turf {
    id: number; name: string; facility_type: string; description: string;
    base_price: number; bowling_machine_price?: number; advance_payment_amount?: number;
    operating_start_time: string; operating_end_time: string;
    slot_duration_minutes: number; status: string; amenities?: string[];
    image_urls?: string[];
}
export interface Analytics {
    total_revenue: number; total_confirmed_bookings: number; total_pending_bookings: number;
}
export interface Discount {
    id: number; code: string | null; type: 'flat' | 'percent'; value: number;
    valid_from: string; valid_to: string; is_active: boolean;
    min_slots?: number | null;
}

export const EMPTY_TURF = {
    name: '', facility_type: 'full_pitch', description: '',
    operating_start_time: '06:00', operating_end_time: '22:00',
    slot_duration_minutes: 60, base_price: '', bowling_machine_price: '' as string | number,
    advance_payment_amount: '' as string | number, amenities: [] as string[],
};
export const EMPTY_DISCOUNT = {
    code: '', type: 'percent' as 'flat' | 'percent', value: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0],
    min_slots: '' as string | number,
};
