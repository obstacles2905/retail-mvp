import Link from "next/link";
import { NotificationBell } from "../NotificationBell";

const GlobalHeader = () => {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-20">
      <div className="flex h-14 w-full items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
          RetailProcure
        </Link>

        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;