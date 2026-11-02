import { getSessions } from '@/lib/actions';
import HomeView from '@/components/HomeView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const sessions = await getSessions();
  const openSessionsCount = sessions.filter((s) => s.status === 'open').length;

  return (
    <HomeView sessions={sessions} openSessionsCount={openSessionsCount} />
  );
}
