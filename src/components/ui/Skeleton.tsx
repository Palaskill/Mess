import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  shimmer?: boolean;
}

export default function Skeleton({
  className = '',
  variant = 'rect',
  shimmer = true,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rect: 'rounded-2xl',
    circle: 'rounded-full',
    text: 'rounded-md h-4 w-full',
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={`skeleton-base bg-slate-800/80 border border-slate-700/50 ${variantStyles} ${
        shimmer ? 'skeleton-shimmer' : 'animate-pulse'
      } ${className}`}
      {...props}
    />
  );
}
