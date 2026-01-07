import type { CSSProperties } from "react";

type SkeletonVariant = "block" | "line" | "emoji";
type SkeletonSize = "sm" | "lg";

type SkeletonProps = {
  as?: "div" | "span";
  variant?: SkeletonVariant;
  size?: SkeletonSize;
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({
  as = "div",
  variant = "block",
  size,
  className,
  style,
}: SkeletonProps) {
  const Tag = as;
  const classes = [
    "skeleton",
    variant === "line" ? "skeleton-line" : "",
    variant === "emoji" ? "skeleton-emoji" : "",
    variant === "line" && size ? size : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return <Tag className={classes} style={style} aria-hidden="true" />;
}
