// Adapted from Linkify: https://github.com/Shreyas-29/linkify
// Border Beam — orbiting light beam via CSS mask + offset-path

interface Props {
    size?: number;
    duration?: number;
    colorFrom?: string;
    colorTo?: string;
    borderWidth?: number;
}

export default function BorderBeam({
    size = 200,
    duration = 6,
    colorFrom = '#00e599',
    colorTo = 'transparent',
    borderWidth = 1.5,
}: Props) {
    return (
        <div
            style={{
                ['--size' as any]: size,
                ['--duration' as any]: duration,
                ['--border-width' as any]: borderWidth,
                ['--color-from' as any]: colorFrom,
                ['--color-to' as any]: colorTo,
            } as React.CSSProperties}
            className="border-beam-element"
        />
    );
}
