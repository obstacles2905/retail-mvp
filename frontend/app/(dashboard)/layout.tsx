import { GlobalNav } from '@/components/layout/GlobalNav';
import { RightSidebarWrapper } from '@/components/layout/RightSidebarWrapper';
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

      {/* Column 2 — Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        <GlobalHeader />
        <div className="flex flex-col flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Column 3 — Context Sidebar (Active Deals) */}
      <RightSidebarWrapper />
    </div>
  );
}
