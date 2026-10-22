'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Hide BottomNav on active session pages so it doesn't collide with session tabs and sticky order buttons
  if (pathname.startsWith('/session/')) {
    return null;
  }

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: '🏠',
      isActive: pathname === '/',
    },
    {
      href: '/admin',
      label: 'Admin',
      icon: '🔧',
      isActive: pathname === '/admin' || pathname.startsWith('/admin/'),
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/90 border-t border-slate-800/80 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
    >
      <div className="max-w-md mx-auto px-6 flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[68px] px-3 py-1 rounded-2xl transition-all duration-150 active:scale-95 ${
                active
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 active:opacity-70'
              }`}
            >
              <span className={`text-xl leading-none mb-1 select-none transition-transform duration-150 ${active ? 'scale-110' : ''}`} role="img" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
