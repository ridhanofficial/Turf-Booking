'use client';
import dynamic from 'next/dynamic';

const AdPopup = dynamic(() => import('./AdPopup'), { ssr: false });

export default function AdPopupWrapper() {
    return <AdPopup />;
}
