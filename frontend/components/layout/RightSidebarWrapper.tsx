'use client';

import { useState } from 'react';
import { DealSidebar } from './DealSidebar';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RightSidebarWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <div className={cn(
        "hidden lg:flex flex-col shrink-0 border-l border-border bg-card transition-all duration-300 ease-in-out relative z-20",
        isOpen ? "w-[260px]" : "w-0"
      )}>
        <div className={cn("w-[260px] h-full overflow-hidden", !isOpen && "hidden")}>
          <DealSidebar />
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -left-4 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground z-50"
          title={isOpen ? "Сховати панель" : "Показати панель"}
        >
          {isOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}
