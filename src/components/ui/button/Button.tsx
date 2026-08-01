import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode; // Button text or content
  size?: "xs" | "sm" | "md"; // Button size
  variant?: "primary" | "outline" | "ghost" | "danger" | "accent"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  /**
   * Left undefined on purpose. A <button> with no type attribute is a submit
   * button, which is what every <Button> inside a <form> relies on — defaulting
   * this to "button" silently breaks form submission (it broke sign-in once).
   */
  type?: "button" | "submit" | "reset";
  className?: string; // Extra classes
}

// Control heights — 28 / 34 / 40px. Compact, but with enough body to carry the
// softer radius without looking pinched.
const sizeClasses = {
  xs: "h-7 gap-1.5 px-2.5 text-xs",
  sm: "h-[34px] gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-[13px]",
};

const variantClasses = {
  primary:
    "bg-brand-600 text-white shadow-brand hover:bg-brand-700 hover:shadow-theme-md active:translate-y-px disabled:bg-brand-300 disabled:shadow-none",
  accent:
    "bg-buyology-yellow-400 text-gray-900 shadow-theme-xs hover:bg-buyology-yellow-500 hover:shadow-theme-md active:translate-y-px",
  outline:
    "border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 active:translate-y-px dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white",
  ghost:
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white",
  danger:
    "bg-error-600 text-white shadow-theme-xs hover:bg-error-700 hover:shadow-theme-md active:translate-y-px disabled:bg-error-300 disabled:shadow-none",
};

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type,
}) => {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex shrink-0 items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex shrink-0 items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
