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
      gsap.from('.session-card', {
        y: 20,
        opacity: 0,
        duration: 0.45,
        stagger: 0.07,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [sessions] }
  );

  return (
    <div ref={containerRef} className="space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
