import { getMenuItems } from '@/lib/actions';
import AdminMenuManager from '@/components/AdminMenuManager';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const items = await getMenuItems();

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-xl mx-auto px-4 pt-6 sm:pt-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-2xl shadow-inner">
                🔧
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Menu Manager
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Set bar items, prices, and default split rules
                </p>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* Manager Component */}
        <AdminMenuManager initialItems={items} />
      </div>
    </div>
  );
}
