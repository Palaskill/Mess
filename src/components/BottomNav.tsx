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
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg bg-slate-900/80 border-t border-slate-700 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[64px] px-4 py-1.5 rounded-lg transition-colors duration-200 ${
                active
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xl leading-none mb-1 select-none" role="img" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-xs font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
