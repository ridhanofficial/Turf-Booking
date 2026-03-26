'use client';
// Adapted from Linkify: https://github.com/Shreyas-29/linkify
// Mouse-follow radial gradient glow on hover

import React, { useRef, useState } from 'react';

interface Props {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    glowColor?: string;
}

export default function MagicCard({ children, style, className, glowColor = 'rgba(0,229,153,0.12)' }: Props) {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setOpacity(1)}
            onMouseLeave={() => setOpacity(0)}
            style={{ position: 'relative', overflow: 'hidden', ...style }}
            className={className}
        >
            {/* Mouse-follow glow */}
            <div
                style={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    inset: -1,
                    opacity,
                    transition: 'opacity 0.3s',
                    background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 60%)`,
                    zIndex: 1,
                }}
            />
            <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>
                {children}
            </div>
        </div>
    );
}
