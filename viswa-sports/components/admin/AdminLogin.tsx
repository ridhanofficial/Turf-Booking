'use client';
import { motion } from 'framer-motion';
import { C, cardStyle, inputStyle, btnNeon } from './admin-styles';

interface AdminLoginProps {
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    loginLoading: boolean;
    onLogin: () => void;
}

export default function AdminLogin({ email, setEmail, password, setPassword, loginLoading, onLogin }: AdminLoginProps) {
    return (
        <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                style={{ ...cardStyle, padding: '48px 40px', width: '100%', maxWidth: 420, border: '1px solid rgba(0,229,153,0.15)' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: '#00e599', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>⚡</div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: C.white, marginBottom: 6 }}>Admin Sign In</h1>
                    <p style={{ color: C.muted, fontSize: 14 }}>Enter your admin credentials to continue</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input type="email" placeholder="admin@viswa.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && onLogin()} style={inputStyle} />
                    <button onClick={onLogin} disabled={loginLoading} style={{ ...btnNeon, opacity: loginLoading ? 0.7 : 1, marginTop: 4 }}>
                        {loginLoading ? 'Signing in…' : 'Sign in →'}
                    </button>
                </div>
                <p style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: C.muted }}>
                    Customer booking portal? <a href="/" style={{ color: C.blue }}>Visit site →</a>
                </p>
            </motion.div>
        </div>
    );
}
