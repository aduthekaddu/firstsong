import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
});

export function IconArrowDown({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 4v16" />
      <path d="m6 14 6 6 6-6" />
    </svg>
  );
}

export function IconArrowRight({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </svg>
  );
}

export function IconArrowLeft({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M20 12H4" />
      <path d="m10 6-6 6 6 6" />
    </svg>
  );
}

export function IconArrowUpRight({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function IconCheck({ size = 15, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

export function IconClose({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function IconVolume({ size = 15, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 9.5h4.5L14 5v14l-5.5-4.5H4z" />
      <path d="M17.5 8.5a5 5 0 0 1 0 7" />
      <path d="M20 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

export function IconVolumeOff({ size = 15, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 9.5h4.5L14 5v14l-5.5-4.5H4z" />
      <path d="m17.5 9.5 4 4" />
      <path d="m21.5 9.5-4 4" />
    </svg>
  );
}

export function IconPlay({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M7 5.5 19 12 7 18.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPause({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconStop({ size = 13, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="5.5" y="5.5" width="13" height="13" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMic({ size = 15, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
      <path d="M9 21h6" />
    </svg>
  );
}

export function IconReset({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
      <path d="M4.5 4.5V9h4.5" />
    </svg>
  );
}

export function IconClock({ size = 15, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconHelp({ size = 15, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.6 2.1-2.6 3.5" />
      <circle cx="12" cy="17.2" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconList({ size = 15, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h10" />
    </svg>
  );
}

/** Signature 6-string + Em chord Urtext brand mark */
export function BrandMark({ className = "h-5 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 22"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect x="0" y="1" width="2.8" height="20" fill="currentColor" />
      <line x1="2.8" y1="3.5" x2="32" y2="3.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2.8" y1="6.7" x2="32" y2="6.7" stroke="currentColor" strokeWidth="1.3" />
      <line x1="2.8" y1="9.9" x2="32" y2="9.9" stroke="currentColor" strokeWidth="1.15" />
      <line x1="2.8" y1="13.1" x2="32" y2="13.1" stroke="currentColor" strokeWidth="1.0" />
      <line x1="2.8" y1="16.3" x2="32" y2="16.3" stroke="currentColor" strokeWidth="0.85" />
      <line x1="2.8" y1="19.5" x2="32" y2="19.5" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="14.5" cy="6.7" r="2.4" fill="var(--cinnabar)" />
      <circle cx="14.5" cy="9.9" r="2.4" fill="var(--cinnabar)" />
    </svg>
  );
}
