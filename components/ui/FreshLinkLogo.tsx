"use client"

interface Props {
  size?: number
  variant?: "icon-only" | "full" | "full-white"
  className?: string
}

/**
 * FreshLink Pro — official logo component.
 * Matches the reference brand image: dark-green bg, leaf+recycle icon, white text.
 */
export default function FreshLinkLogo({ size = 36, variant = "full", className = "" }: Props) {
  const iconBg   = "#1B4332"   // deep forest green — sidebar background color
  const leafGreen = "#4ADE80"  // bright leaf green
  const leafDark  = "#16A34A"  // darker green for depth

  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Circular badge background */}
      <circle cx="20" cy="20" r="20" fill={iconBg} />

      {/* Outer ring arc (recycle/loop) */}
      <path
        d="M20 7 C27.7 7 34 12.9 34 20.5 C34 28.1 27.7 34 20 34"
        stroke={leafGreen}
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 34 C12.3 34 6 28.1 6 20.5 C6 12.9 12.3 7 20 7"
        stroke={leafDark}
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arrow head right */}
      <path d="M31.5 17 L34 20.5 L31 23" stroke={leafGreen} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Arrow head left */}
      <path d="M8.5 23.5 L6 20 L9 17" stroke={leafDark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Leaf center */}
      <path
        d="M20 13 C20 13 26 16 26 21 C26 24.5 23.5 27 20 27 C16.5 27 14 24.5 14 21 C14 16 20 13 20 13 Z"
        fill={leafGreen}
        opacity="0.92"
      />
      {/* Leaf vein */}
      <path d="M20 27 L20 17" stroke={iconBg} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 22 L23.5 19" stroke={iconBg} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 24 L17 21.5" stroke={iconBg} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )

  if (variant === "icon-only") return <span className={className}>{Icon}</span>

  const textWhite = variant === "full-white"

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {Icon}
      <div className="flex flex-col leading-none">
        <span
          className="font-extrabold tracking-tight"
          style={{
            fontSize: size * 0.42,
            color: textWhite ? "#ffffff" : "#1B4332",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          FRESH<span style={{ color: leafGreen }}>LINK</span>
        </span>
        <span
          className="font-black tracking-widest uppercase"
          style={{
            fontSize: size * 0.22,
            color: textWhite ? leafGreen : leafDark,
            letterSpacing: "0.18em",
            lineHeight: 1.2,
          }}
        >
          PRO
        </span>
      </div>
    </div>
  )
}
