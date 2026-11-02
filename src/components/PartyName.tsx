'use client';

import type { CSSProperties } from 'react';

/** Keep the real name intact for assistive technology; animate only its visual copy. */
export default function PartyName({ name, count = 0 }: { name: string; count?: number }) {
  if (count < 3) return <>{name}</>;
  const level = count >= 6 ? 'wavy' : 'sway';
  const connectedScript = /[\u0600-\u08ff]/.test(name);
  return <span className={`party-name party-name--${level}`} key={`${name}-${count}`}>
    <span className="sr-only">{name}</span>
    <span aria-hidden="true" className="party-name-visual">
      {connectedScript ? <span className="party-letter">{name}</span> : Array.from(name).map((letter, index) =>
        <span key={index} className="party-letter" style={{ '--letter-delay': `${index * 55}ms` } as CSSProperties}>{letter === ' ' ? '\u00a0' : letter}</span>)}
    </span>
    <span aria-hidden="true" className="party-mood">{count >= 6 ? '😵‍💫' : '🫠'}</span>
  </span>;
}
