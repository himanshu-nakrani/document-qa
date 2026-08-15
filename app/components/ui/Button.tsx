"use client";

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-3.5 py-2 text-[13px] rounded-lg gap-2",
  lg: "px-4 py-2.5 text-sm rounded-lg gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: "var(--accent)",
        color: "var(--accent-fg)",
        fontWeight: 600,
      };
    case "danger":
      return {
        background: "var(--error-soft)",
        color: "var(--error)",
        border: "1px solid var(--error-soft)",
        fontWeight: 600,
      };
    case "ghost":
      return { background: "transparent", color: "var(--text-secondary)" };
    case "secondary":
    default:
      return {
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      };
  }
}

/**
 * Token-driven button with four variants. Hover/focus states come from CSS
 * variables; disabled dims and drops the pointer.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className = "", style, children, ...rest },
  ref,
) {
  const [hover, setHover] = React.useState(false);
  const interactive = !rest.disabled;

  const hoverStyle: React.CSSProperties =
    hover && interactive
      ? variant === "primary"
        ? { background: "var(--accent-hover)" }
        : variant === "secondary"
          ? { borderColor: "var(--border-hover)", background: "var(--bg-surface-hover)" }
          : variant === "danger"
            ? { background: "var(--error-soft)", filter: "brightness(1.15)" }
            : { color: "var(--text-primary)" }
      : {};

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-medium transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${className}`}
      style={{ ...variantStyle(variant), ...hoverStyle, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
    >
      {children}
    </button>
  );
});
