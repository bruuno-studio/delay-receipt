import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowLeft(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </BaseIcon>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </BaseIcon>
  );
}

export function ArrowUpRight(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </BaseIcon>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function Calendar(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="18" height="17" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
    </BaseIcon>
  );
}

export function Check(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </BaseIcon>
  );
}

export function CheckCircle2(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </BaseIcon>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function ChevronUp(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m18 15-6-6-6 6" />
    </BaseIcon>
  );
}

export function Code2(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m18 16 4-4-4-4" />
      <path d="m6 8-4 4 4 4" />
      <path d="m14.5 4-5 16" />
    </BaseIcon>
  );
}

export function Copy(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="9" y="9" width="12" height="12" />
      <path d="M5 15H3V3h12v2" />
    </BaseIcon>
  );
}

export function Download(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </BaseIcon>
  );
}

export function ExternalLink(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </BaseIcon>
  );
}

export function Link2(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <path d="M8 12h8" />
    </BaseIcon>
  );
}

export function Loader2(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </BaseIcon>
  );
}

export function Lock(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="11" width="16" height="10" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </BaseIcon>
  );
}

export function Mail(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="2" y="4" width="20" height="16" />
      <path d="m2 6 10 7 10-7" />
    </BaseIcon>
  );
}

export function Plane(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 16l20-5-20-5 4 5-4 5z" />
      <path d="M6 11h10" />
    </BaseIcon>
  );
}

export function Radio(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
    </BaseIcon>
  );
}

export function Share2(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
    </BaseIcon>
  );
}

export function ShieldAlert(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}

export function ShieldCheck(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </BaseIcon>
  );
}

export function Square(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="16" height="16" />
    </BaseIcon>
  );
}

export function Terminal(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m4 17 6-5-6-5" />
      <path d="M12 19h8" />
    </BaseIcon>
  );
}

export function Volume2(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </BaseIcon>
  );
}

export function X(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </BaseIcon>
  );
}
