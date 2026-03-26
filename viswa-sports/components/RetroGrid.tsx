// Adapted from Linkify: https://github.com/Shreyas-29/linkify
// Pure CSS/inline implementation — no Tailwind required

export default function RetroGrid({ opacity = 0.4 }: { opacity?: number }) {
    return (
        <div style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            perspective: '200px',
            opacity,
        }}>
            {/* Tilted grid layer */}
            <div style={{ position: 'absolute', inset: 0, transform: 'rotateX(35deg)' }}>
                <div className="retro-grid-lines" />
            </div>
            {/* Fade-out gradient at bottom */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, #000000 0%, transparent 90%)',
            }} />
        </div>
    );
}
