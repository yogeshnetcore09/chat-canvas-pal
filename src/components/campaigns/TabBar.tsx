import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { tabs as defaultTabs } from "./campaigns.data";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Status filter tabs. Active tab is charcoal + bold with an underline bar.
 * In `compact` mode (chat panel open) the strip becomes horizontally
 * scrollable with ‹ › arrows so it fits the reduced width.
 */
export default function TabBar({
  compact = false,
  tabs = defaultTabs,
  active: activeProp,
  onChange,
}: {
  compact?: boolean;
  /** Tabs without a count render the bare label. */
  tabs?: { label: string; count?: number }[];
  /** Pass to control the selected tab from outside (e.g. to swap content). */
  active?: number;
  onChange?: (index: number) => void;
}) {
  const [activeState, setActiveState] = useState(0);
  const active = activeProp ?? activeState;
  const setActive = (i: number) => {
    setActiveState(i);
    onChange?.(i);
  };
  const scroller = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) =>
    scroller.current?.scrollBy({ left: dir * 160, behavior: "smooth" });

  return (
    <div className="flex min-w-0 items-center">
      {compact && (
        <button
          aria-label="Scroll tabs left"
          onClick={() => scroll(-1)}
          // mb-2 offsets the tabs' pb-2.5 underline padding so the chevron
          // centers on the tab labels, not the full row height.
          className="mr-1 mb-2 grid h-6 w-5 shrink-0 place-items-center text-[#6F6F8D] hover:text-[#17173A]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
      )}

      <div
        ref={scroller}
        className={`flex items-center gap-8 ${
          compact ? "scroll-slim overflow-x-auto" : ""
        }`}
      >
        {tabs.map((tab, i) => {
          const isActive = i === active;
          return (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className="relative shrink-0 whitespace-nowrap pb-2.5 pt-0.5 font-manrope text-sm tracking-[0.29px] transition-colors"
            >
              <span
                className={isActive ? "font-bold text-[#17173A]" : "font-medium text-[#6F6F8D]"}
              >
                {tab.label}
                {tab.count !== undefined && ` (${pad(tab.count)})`}
              </span>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-[1.5px] bg-[#17173A]" />
              )}
            </button>
          );
        })}
      </div>

      {compact && (
        <button
          aria-label="Scroll tabs right"
          onClick={() => scroll(1)}
          className="ml-1 mb-2 grid h-6 w-5 shrink-0 place-items-center text-[#6F6F8D] hover:text-[#17173A]"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
