
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost";
}

export function Button({
  children,
  className = "",
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const variants = {
    default: "bg-[#3B2418] text-white hover:bg-[#513324]",
    ghost: "bg-transparent text-[#3B2418] hover:bg-stone-100",
  };

  return (
    <button
      type={type}
      className={`
        inline-flex items-center justify-center
        rounded-lg transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
