import { SlidersHorizontal } from 'lucide-react';
import { getMenuItems } from '@/lib/actions';
import AdminHeading from '@/components/AdminHeading';
import AdminMenuManager from '@/components/AdminMenuManager';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const items = await getMenuItems();

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                <SlidersHorizontal aria-hidden="true" className="w-6 h-6" />
              </div>
              <AdminHeading />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <LanguageToggle variant="compact" />
              <ThemeToggle variant="compact" />
            </div>
          </div>
        </header>

        {/* Manager Component */}
        <AdminMenuManager initialItems={items} />
      </div>
    </div>
  );
}
