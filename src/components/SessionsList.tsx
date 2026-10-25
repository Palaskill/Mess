'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import SessionCard from '@/components/SessionCard';
import { Session } from '@/types';

interface SessionsListProps {
  sessions: (Session & { participant_count?: number })[];
}

export default function SessionsList({ sessions }: SessionsListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        '.session-card',
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        }
      );
    },
    { scope: containerRef, dependencies: [] }
  );

  return (
    <div ref={containerRef} className="space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
