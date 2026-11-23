import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3.5 py-2.5 text-sm text-[#17211F] placeholder:text-[#5B6663]/70 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#0E6B5B] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3.5 py-2.5 text-sm text-[#17211F] placeholder:text-[#5B6663]/70 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#0E6B5B] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
