"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "outline" | "gold";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-teal text-white hover:bg-teal-light hover:shadow-lg hover:shadow-teal/25",
  outline:
    "bg-transparent text-navy border-[1.5px] border-navy-light hover:bg-navy hover:text-cream hover:border-navy",
  gold:
    "bg-gold text-navy hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`font-ui font-medium text-[0.78rem] tracking-wider uppercase px-9 py-4 rounded-md cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-[3px] min-h-[48px] ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
