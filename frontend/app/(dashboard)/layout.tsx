import { GlobalNav } from '@/components/layout/GlobalNav';
import { DealSidebar } from '@/components/layout/DealSidebar';
import GlobalHeader from '@/components/layout/GlobalHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Column 1 — Global Nav */}
      <aside className="hidden w-[80px] shrink-0 flex-col items-center border-r border-border bg-card md:flex">
        <GlobalNav />
      </aside>

      {/* Column 2 — Context Sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <DealSidebar />
      </aside>

      {/* Column 3 — Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <GlobalHeader />
        {children}
      </main>
    </div>
  );
}
