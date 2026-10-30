import { Database, Filter, Info } from "lucide-react";
import {
  segments,
  warehouseSegments,
  type Segment,
  type WarehouseSegment,
} from "./segments.data";
import sparkleAi from "/campaign-assets/ic-sparkle-ai.gif";

/**
 * Audience → Segments listing table. Same card shell, frozen first column and
 * grid-driven alignment as <CampaignTable/>, with the Segments columns: identity,
 * the two timestamps, then reach per channel.
 */

// Shared column template so the header and every row line up. Segment info is a
// fixed frozen-style column; the rest flex to fill the remaining width.
const GRID = "grid-cols-[302px_1.35fr_1.35fr_1fr_1fr_1fr_1fr_1fr]";

interface Column {
  label: string;
  /** Columns whose header carries the little info affordance. */
  info?: boolean;
}

const COLUMNS: Column[] = [
  { label: "Created on", info: true },
  { label: "Refreshed on", info: true },
  { label: "User count" },
  { label: "Email" },
  { label: "SMS" },
  { label: "App push" },
  { label: "Web push" },
];

/** Counts you can drill into render as royal-blue links; the rest stay plain. */
const LINKED_KEYS = ["userCount", "email", "sms"] as const;

const nf = new Intl.NumberFormat("en-US");

function CountCell({ value, linked }: { value: number; linked: boolean }) {
  return (
    <div
      className={`px-5 text-right font-manrope text-sm ${
        linked && value > 0 ? "text-[#2F68E5]" : "text-[#17173A]"
      }`}
    >
      {nf.format(value)}
    </div>
  );
}

function SegmentRow({ s }: { s: Segment }) {
  return (
    <div
      className={`group grid ${GRID} min-h-[114px] items-center border-b border-[#EDF0F7] bg-white transition-colors hover:bg-[#F5F8FF]`}
    >
      {/* Segment info (frozen column — stays pinned during horizontal scroll) */}
      <div className="sticky left-0 z-10 flex h-full items-center gap-3.5 border-r border-[#EDF0F7] bg-white px-4 group-hover:bg-[#F5F8FF]">
        {/* AI-built segments carry the co-marketer's sparkle in place of the
            plain filter glyph, so the list says where a segment came from. */}
        {s.aiGenerated ? (
          <img src={sparkleAi} alt="Created with AI" className="size-[18px] shrink-0 object-contain" />
        ) : (
          <Filter className="h-[18px] w-[18px] shrink-0 text-[#6F6F8D]" strokeWidth={1.5} />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-manrope text-[13px] font-semibold leading-[18px] tracking-[0.29px] text-[#17173A]">
            {s.name}
          </p>
          <p className="mt-1.5 font-manrope text-xs tracking-[0.25px] text-[#6F6F8D]">
            ID - {s.id}
          </p>
        </div>
      </div>

      <div className="px-5 font-manrope text-sm text-[#17173A]">{s.createdOn}</div>
      <div className="px-5 font-manrope text-sm text-[#17173A]">{s.refreshedOn}</div>
      {LINKED_KEYS.map((k) => (
        <CountCell key={k} value={s[k]} linked />
      ))}
      <CountCell value={s.appPush} linked={false} />
      <CountCell value={s.webPush} linked={false} />
    </div>
  );
}

export default function SegmentTable({
  /** Segments created this session — shown above the stored rows. */
  extra = [],
}: {
  extra?: Segment[];
}) {
  return (
    <div className="scroll-slim overflow-x-auto rounded-lg border border-[#DDE2EE] bg-white shadow-[0px_5px_10px_0px_rgba(23,23,58,0.05)]">
      <div className="min-w-[1180px]">
        {/* Header row */}
        <div className={`grid ${GRID} h-[52px] items-center border-b border-[#DDE2EE]`}>
          <div className="sticky left-0 z-10 flex h-full items-center border-r border-[#EDF0F7] bg-white px-4">
            <span className="font-manrope text-sm font-medium text-[#6F6F8D]">
              Segment info
            </span>
          </div>
          {COLUMNS.map((c, i) => (
            <div
              key={c.label}
              className={`flex items-center gap-1.5 px-5 font-manrope text-sm font-medium text-[#6F6F8D] ${
                // The two timestamp columns read left; every count reads right,
                // flush with the numbers under them.
                i < 2 ? "justify-start" : "justify-end"
              }`}
            >
              <span>{c.label}</span>
              {c.info && <Info className="h-4 w-4 shrink-0" strokeWidth={1.6} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div>
          {[...extra, ...segments].map((s) => (
            <SegmentRow key={s.id} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Warehouse segments only carry identity, the two timestamps and a total —
// there's no per-channel reach until the audience is synced into Netcore.
const WAREHOUSE_GRID = "grid-cols-[302px_1.35fr_1.35fr_1fr]";

/** Audience → Segments, "Warehouse segments" tab: SQL-built audiences. */
export function WarehouseSegmentTable({
  /** Warehouse segments saved this session — shown above the stored rows. */
  extra = [],
}: {
  extra?: WarehouseSegment[];
}) {
  return (
    <div className="scroll-slim overflow-x-auto rounded-lg border border-[#DDE2EE] bg-white shadow-[0px_5px_10px_0px_rgba(23,23,58,0.05)]">
      <div className="min-w-[860px]">
        <div className={`grid ${WAREHOUSE_GRID} h-[52px] items-center border-b border-[#DDE2EE]`}>
          <div className="sticky left-0 z-10 flex h-full items-center border-r border-[#EDF0F7] bg-white px-4">
            <span className="font-manrope text-sm font-medium text-[#6F6F8D]">
              Segment info
            </span>
          </div>
          {COLUMNS.slice(0, 3).map((c, i) => (
            <div
              key={c.label}
              className={`flex items-center gap-1.5 px-5 font-manrope text-sm font-medium text-[#6F6F8D] ${
                i < 2 ? "justify-start" : "justify-end"
              }`}
            >
              <span>{c.label}</span>
              {c.info && <Info className="h-4 w-4 shrink-0" strokeWidth={1.6} />}
            </div>
          ))}
        </div>

        <div>
          {[...extra, ...warehouseSegments].map((s) => (
            <div
              key={s.id}
              className={`group grid ${WAREHOUSE_GRID} min-h-[114px] items-center border-b border-[#EDF0F7] bg-white transition-colors hover:bg-[#F5F8FF]`}
            >
              <div className="sticky left-0 z-10 flex h-full items-center gap-3.5 border-r border-[#EDF0F7] bg-white px-4 group-hover:bg-[#F5F8FF]">
                <Database className="h-[18px] w-[18px] shrink-0 text-[#6F6F8D]" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="font-manrope text-[13px] font-semibold leading-[18px] tracking-[0.29px] text-[#17173A]">
                    {s.name}
                  </p>
                  <p className="mt-1.5 font-manrope text-xs tracking-[0.25px] text-[#6F6F8D]">
                    ID - {s.id}
                  </p>
                </div>
              </div>
              <div className="px-5 font-manrope text-sm text-[#17173A]">{s.createdOn}</div>
              <div className="px-5 font-manrope text-sm text-[#17173A]">{s.refreshedOn}</div>
              {/* Plain text, not a link — there's nothing to drill into yet. */}
              <CountCell value={s.userCount} linked={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
