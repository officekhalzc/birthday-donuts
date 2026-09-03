/**
 * The signature mark of the program: a hairline rule made of scattered
 * sprinkles. Used under headings and, in a single-sprinkle form, on the
 * calendar where the colour carries the order's status.
 */
const ANGLES = [28, -34, 12, -18, 46, -8, 33, -41, 6, -26, 39, -14, 22, -37, 9];

export function SprinkleRule({
  width = 220,
  colors = ["#B0416B", "#E8A33D", "#6F9B78"],
  className = "",
}: { width?: number; colors?: string[]; className?: string }) {
  const count = Math.max(6, Math.round(width / 16));
  return (
    <svg
      width={width} height={12} viewBox={`0 0 ${width} 12`}
      className={className} aria-hidden="true" focusable="false"
    >
      {Array.from({ length: count }).map((_, i) => {
        const x = (i + 0.5) * (width / count);
        const y = 6 + ((i % 3) - 1) * 1.6;
        return (
          <rect
            key={i} x={x} y={y - 1.1} width={6.5} height={2.4} rx={1.2}
            fill={colors[i % colors.length]}
            transform={`rotate(${ANGLES[i % ANGLES.length]} ${x + 3.2} ${y})`}
          />
        );
      })}
    </svg>
  );
}

export function Sprinkle({ color, title }: { color: string; title?: string }) {
  return (
    <svg width={11} height={11} viewBox="0 0 11 11" role={title ? "img" : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <rect x="1" y="4.3" width="9" height="2.6" rx="1.3" fill={color} transform="rotate(-30 5.5 5.5)" />
    </svg>
  );
}
