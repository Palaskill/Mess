'use client';

import { useId } from 'react';

interface FriendAvatarProps {
  name: string;
  color: string;
  size?: number;
}

/** Decorative clay-style avatar; the adjacent name remains the accessible label. */
export default function FriendAvatar({ name, color, size = 48 }: FriendAvatarProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 64 64" className="friend-avatar shrink-0" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${id}-base`} cx="28%" cy="15%" r="95%">
          <stop stopColor="#ffffff" stopOpacity=".42" />
          <stop offset=".5" stopColor={color} stopOpacity=".18" />
          <stop offset="1" stopColor={color} stopOpacity=".4" />
        </radialGradient>
        <radialGradient id={`${id}-clay`} cx="28%" cy="18%" r="85%">
          <stop stopColor="#fff" />
          <stop offset=".26" stopColor="#ffe6c9" />
          <stop offset=".7" stopColor="#edb58e" />
          <stop offset="1" stopColor="#b97557" />
        </radialGradient>
        <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="22%" cy="0%" r="100%">
          <stop stopColor="#fff" stopOpacity=".65" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#020617" stopOpacity=".5" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="21" fill={`url(#${id}-base)`} stroke={color} strokeOpacity=".2" />
      <ellipse cx="32" cy="54" rx="20" ry="5" fill="#020617" opacity=".16" />
      <path d="M13 51c0-12 8-18 19-18s19 6 19 18c-9 7-29 7-38 0Z" fill={`url(#${id}-shirt)`} />
      <path d="M13 51c0-12 8-18 19-18s19 6 19 18c-9 7-29 7-38 0Z" fill={`url(#${id}-shine)`} />
      <ellipse cx="32" cy="28" rx="14" ry="16" fill="#020617" opacity=".14" />
      <ellipse cx="31" cy="26" rx="14" ry="16" fill={`url(#${id}-clay)`} />
      <ellipse cx="26" cy="25" rx="1.5" ry="2" fill="#372a29" />
      <ellipse cx="36" cy="25" rx="1.5" ry="2" fill="#372a29" />
      <path d="M27 32q4 4 8 0" fill="none" stroke="#87533f" strokeWidth="1.7" strokeLinecap="round" />
      {size >= 40 && <>
        <circle cx="52" cy="52" r="10" fill="#f8fafc" stroke={color} strokeWidth="1.5" />
        <text x="52" y="52" dy=".35em" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="800" fontFamily="system-ui, sans-serif">{Array.from(name.trim())[0]?.toLocaleUpperCase()}</text>
      </>}
    </svg>
  );
}
