import { GlobalNav } from '@/components/layout/GlobalNav';
import { RightSidebarProvider } from '@/components/layout/RightSidebarContext';
import { RightSidebarWrapper } from '@/components/layout/RightSidebarWrapper';
import GlobalHeader from '@/components/layout/GlobalHeader';
import { GLOBAL_NAV_WIDTH_PX } from '@/lib/dashboard-layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RightSidebarProvider>
    <div className="flex h-screen overflow-hidden">
      {/* Column 1 — Global Nav (fixed width — see GLOBAL_NAV_WIDTH_PX) */}
      <aside
        className="hidden shrink-0 flex-col border-r border-border bg-card md:flex"
        style={{ width: GLOBAL_NAV_WIDTH_PX, minWidth: GLOBAL_NAV_WIDTH_PX }}
      >
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
    </RightSidebarProvider>
  );
}
