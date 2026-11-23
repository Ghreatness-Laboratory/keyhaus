import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E6B5B] disabled:pointer-events-none disabled:opacity-50 min-h-[44px] px-5 py-2.5 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#0E6B5B] text-white hover:bg-[#0a574a]",
        secondary:
          "bg-[#DDEEE9] text-[#0E6B5B] hover:bg-[#cde4dd]",
        outline:
          "border-[1.5px] border-[#E2DFD6] bg-white text-[#17211F] hover:bg-[#F6F4EF]",
        ghost: "text-[#17211F] hover:bg-[#E2DFD6]/50",
        destructive: "bg-[#B3261E] text-white hover:bg-[#941f18]",
      },
      size: {
        default: "min-h-[44px] px-5 py-2.5",
        sm: "min-h-[44px] px-3.5 py-2 text-xs",
        lg: "min-h-[48px] px-6 py-3 text-base",
        icon: "h-[44px] w-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
