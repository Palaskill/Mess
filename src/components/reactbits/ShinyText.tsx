'use client';

import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = '',
}: ShinyTextProps) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`shiny-text inline-block relative text-transparent bg-clip-text bg-[length:250%_100%] ${
        disabled ? '' : 'animate-shine'
      } ${className}`}
      style={{
        animationDuration,
      }}
    >
      {text}
      <style jsx>{`
        @keyframes shine {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
        .shiny-text {
          background-image: linear-gradient(
            120deg,
            currentColor 30%,
            rgba(255, 255, 255, 0.95) 50%,
            currentColor 70%
          );
        }
        :global(html.light) .shiny-text {
          background-image: linear-gradient(
            120deg,
            currentColor 30%,
            #2563eb 50%,
            currentColor 70%
          );
        }
        .animate-shine {
          animation: shine ${animationDuration} infinite linear;
        }
      `}</style>
    </span>
  );
}
