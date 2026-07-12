import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function CircleIndianRupee({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2500/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 6h8" />
      <path d="M8 9.5h8" />
      <path d="M10 13c4.667 0 4.667-7 0-7" />
      <path d="M8 13h3" />
      <path d="m8 13 6 6" />
    </svg>
  );
}
