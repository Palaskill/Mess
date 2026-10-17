import { notFound } from 'next/navigation';
import { getSessionData, getActiveMenuItems } from '@/lib/actions';
import SessionView from '@/components/SessionView';

export const dynamic = 'force-dynamic';

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;

  const [sessionData, menuItems] = await Promise.all([
    getSessionData(id),
    getActiveMenuItems(),
  ]);

  if (!sessionData.session) {
    notFound();
  }

  return (
    <SessionView
      session={sessionData.session}
      participants={sessionData.participants}
      orders={sessionData.orders}
      assignments={sessionData.assignments}
      menuItems={menuItems}
    />
  );
}
