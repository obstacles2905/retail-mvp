import Link from "next/link";
import { NotificationBell } from "../NotificationBell";

const GlobalHeader = () => {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-20">
      <div className="flex h-14 w-full items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-white">
            <span className="font-bold text-lg leading-none">T</span>
          </div>
          Teno
        </Link>

        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;