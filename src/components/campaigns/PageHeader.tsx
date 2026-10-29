import { Search, ChevronDown, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import sparkle from "/campaign-assets/ic-sparkle-ai.gif";
import CreateWithAINudge from "./CreateWithAINudge";

export type PageHeaderCtaOption = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  onSelect: () => void;
};

/** Title block with the search affordance + primary create CTA. */
export default function PageHeader({
  title = "Campaigns",
  subtitle = "View and manage campaigns",
  ctaLabel = "New campaign",
  showCtaChevron = true,
  showCtaAiIcon = false,
  showAiCta = false,
  showAiNudge = false,
  onCloseAiNudge,
  onCtaClick,
  onAiCtaClick,
  ctaOptions,
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  /** Hides the chevron on the primary CTA (it doesn't open a menu everywhere). */
  showCtaChevron?: boolean;
  /** Leads the primary CTA with an AI sparkle (e.g. Segments' "Create"). */
  showCtaAiIcon?: boolean;
  /** Shows a secondary "Create with AI" button before the primary CTA. */
  showAiCta?: boolean;
  /** Shows the discovery nudge dropped below the Create with AI button. */
  showAiNudge?: boolean;
  onCloseAiNudge?: () => void;
  /** Click handler for the primary CTA (e.g. open the create flow). */
  onCtaClick?: () => void;
  /** Click handler for the secondary "Create with AI" button. */
  onAiCtaClick?: () => void;
  /** Turns the primary CTA into a menu of these options (e.g. Segments' "Create"). */
  ctaOptions?: PageHeaderCtaOption[];
}) {
  const ctaButton = (
    <button
      onClick={ctaOptions ? undefined : onCtaClick}
      className="dc-btn dc-btn-primary shadow-[0px_5px_5px_rgba(0,0,0,0.05)]"
    >
      {/* The animated AI sparkle asset. It's royal blue, which would vanish
          against this button's royal-blue fill, so it's flattened to white. */}
      {showCtaAiIcon && (
        <img
          src={sparkle}
          alt=""
          className="h-4 w-4 [filter:brightness(0)_invert(1)]"
        />
      )}
      {ctaLabel}
      {showCtaChevron && <ChevronDown className="h-4 w-4" strokeWidth={2} />}
    </button>
  );

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-manrope text-[20px] font-bold leading-tight text-[#17173A]">
          {title}
        </h1>
        <p className="mt-1 font-manrope text-[13px] text-[#6F6F8D]">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          aria-label={`Search ${title.toLowerCase()}`}
          className="grid h-[29px] w-[29px] place-items-center rounded-[2px] border border-[#DDE2EE] bg-white text-[#6F6F8D] transition-colors hover:bg-[#F4F8FF]"
        >
          <Search className="h-4 w-4" strokeWidth={1.8} />
        </button>
        {showAiCta && (
          <div className="relative">
            <button
              onClick={onAiCtaClick}
              className="dc-btn dc-btn-secondary"
            >
              <img src={sparkle} alt="" className="h-4 w-4" />
              Create with AI
            </button>
            {showAiNudge && <CreateWithAINudge onClose={() => onCloseAiNudge?.()} />}
          </div>
        )}
        {ctaOptions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{ctaButton}</DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-[260px] rounded-[6px] border-[#DDE2EE] p-1 shadow-[0px_8px_24px_rgba(23,23,58,0.12)]"
            >
              {ctaOptions.map(({ label, description, icon: Icon, onSelect }) => (
                <DropdownMenuItem
                  key={label}
                  onSelect={onSelect}
                  className="flex cursor-pointer items-start gap-3 rounded-[4px] px-3 py-2.5 focus:bg-[#F4F8FF]"
                >
                  {Icon && (
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[4px] bg-[#EEF3FF] text-[#2459E0]">
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-manrope text-[13px] font-semibold text-[#17173A]">
                      {label}
                    </span>
                    {description && (
                      <span className="mt-0.5 block font-manrope text-[12px] leading-snug text-[#6F6F8D]">
                        {description}
                      </span>
                    )}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          ctaButton
        )}
      </div>
    </div>
  );
}
