import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className, size = 28, showText = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 shrink-0", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="JyGS Logo"
      >
        {/* Rounded square background */}
        <rect width="48" height="48" rx="12" className="fill-primary" />
        {/* Shopping bag body */}
        <path
          d="M14 18h20l-2 16H16L14 18z"
          className="fill-primary-foreground"
          opacity="0.9"
        />
        {/* Bag handle */}
        <path
          d="M19 18v-3a5 5 0 0 1 10 0v3"
          className="stroke-primary-foreground"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        {/* Rupee symbol inside bag */}
        <path
          d="M21 24h6M21 27h6M23 24v6"
          className="stroke-primary"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className="text-lg font-bold tracking-tight">JyGS</span>
      )}
    </span>
  );
}

export function LogoIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="12" fill="#6366f1" />
      <path d="M14 18h20l-2 16H16L14 18z" fill="white" opacity="0.9" />
      <path
        d="M19 18v-3a5 5 0 0 1 10 0v3"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M21 24h6M21 27h6M23 24v6"
        stroke="#6366f1"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
