import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "default" | "primary" | "white";
}

const sizeMap = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const colorMap = {
  default: "text-gray-400",
  primary: "text-[#10a37f]",
  white: "text-white",
};

export function Spinner({
  size = "md",
  color = "default",
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin", sizeMap[size], colorMap[color], className)}
      {...props}
    >
      <Loader2 className="h-full w-full" />
    </div>
  );
} 