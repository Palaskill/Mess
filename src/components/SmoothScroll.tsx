import { ReactNode } from 'react';

// Native scrolling respects reduced motion, keyboard navigation and mobile sheets.
export default function SmoothScroll({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
