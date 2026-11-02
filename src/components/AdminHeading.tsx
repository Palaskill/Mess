'use client';

import { useLanguage } from '@/lib/i18n';

export default function AdminHeading() {
  const { language } = useLanguage();
  const [title, subtitle] = language === 'fr'
    ? ['La carte', 'Articles, tarifs et règles de partage.']
    : language === 'ar'
      ? ['القائمة', 'الأصناف والأسعار وقواعد التقسيم.']
      : ['The menu', 'Items, prices and sharing rules.'];
  return <div><h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h1><p className="text-sm text-slate-400 mt-1">{subtitle}</p></div>;
}
