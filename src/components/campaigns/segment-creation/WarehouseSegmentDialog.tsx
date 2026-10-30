import { useEffect, useMemo, useState } from "react";
import { Database, Loader2, Play, RefreshCw, Save, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DEFAULT_SQL = `WITH customer_metrics AS (
    -- Step 1: Gather and normalize your scores and engagement metrics
    SELECT
        customer_id,
        email_address,
        renewal_likelihood_score, -- Assumed scale: 0.0 to 1.0
        days_since_last_login,
        total_features_used_30d,
        contract_end_date,
        -- Calculate a simple engagement tier dynamically if not already stored
        CASE
            WHEN days_since_last_login <= 7 AND total_features_used_30d >= 5 THEN 'High'
            WHEN days_since_last_login <= 30 THEN 'Medium'
            ELSE 'Low'
        END AS engagement_tier
    FROM
        analytics_production.customer_health_scores
    WHERE
        is_active = TRUE
        -- Only pull customers whose contracts expire in the next 90 days
        AND contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
),`;

/** What "Generate SQL" writes. Prototype: every prompt gets this cart-abandonment query. */
const GENERATED_SQL = `WITH added_to_cart AS (
    -- Step 1: Find all users who added an item to their cart in the last 30 days
    SELECT DISTINCT
        user_id,
        email_address,
        product_id,
        product_name,
        event_time AS added_to_cart_at
    FROM
        analytics_production.user_events
    WHERE
        event_name = 'added_to_cart'
        AND event_time >= CURRENT_DATE - INTERVAL '30 days'
),

purchased_items AS (
    -- Step 2: Find all users who successfully purchased items in the last 30 days
    SELECT DISTINCT
        user_id,
        product_id
    FROM
        analytics_production.user_events
    WHERE
        event_name = 'purchase_completed'
        -- Matches the same 30-day window
        AND event_time >= CURRENT_DATE - INTERVAL '30 days'
)

-- Step 3: Filter out anyone who eventually bought the product they added to the cart
SELECT
    cart.user_id,
    cart.email_address,
    cart.product_id,
    cart.product_name,
    cart.added_to_cart_at,
    -- Calculate how long the item has been sitting abandoned
    DATEDIFF(day, cart.added_to_cart_at, GETDATE()) AS days_abandoned,
    'Cart_Abandonment_Winback' AS targeted_journey_segment
FROM
    added_to_cart cart
LEFT JOIN
    purchased_items pur
    ON cart.user_id = pur.user_id
    AND cart.product_id = pur.product_id
WHERE
    -- This condition keeps only the users who DO NOT have a matching purchase record
    pur.user_id IS NULL
ORDER BY
    cart.added_to_cart_at DESC;`;

const PROMPT_EXAMPLE =
  "Users who added to cart in the past 30 days but did not purchase the product";

// The app's global font rule beats Tailwind's font-mono on form fields, and
// Manrope ligates "--" into a dash — so the editor pins its own code font.
const CODE_FONT = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontVariantLigatures: "none",
} as const;

const LAST_REFRESHED = "Aug 13, 2026 01:39 AM";

/** Sample results the preview "returns" — this is a prototype, nothing is queried. */
interface PreviewResult {
  columns: string[];
  rows: string[][];
  matched: number;
  /** Name the segment is saved under. */
  segmentName: string;
}

const CART_PREVIEW: PreviewResult = {
  columns: [
    "user_id",
    "email_address",
    "product_id",
    "product_name",
    "added_to_cart_at",
    "days_abandoned",
    "targeted_journey_segment",
  ],
  rows: [
    ["U-58213", "rahul.mehta@gmail.com", "P-2041", "AirFlex Running Shoes", "2026-10-28 18:42", "2", "Cart_Abandonment_Winback"],
    ["U-57940", "sneha.iyer@outlook.com", "P-1187", "Linen Summer Shirt", "2026-10-26 09:15", "4", "Cart_Abandonment_Winback"],
    ["U-56622", "arjun.k@yahoo.com", "P-3302", "Wireless Earbuds Pro", "2026-10-23 21:03", "7", "Cart_Abandonment_Winback"],
    ["U-55871", "priya.nair@gmail.com", "P-0954", "Vitamin C Face Serum", "2026-10-19 13:27", "11", "Cart_Abandonment_Winback"],
    ["U-54108", "vikram.shah@hotmail.com", "P-2768", "Smart Fitness Band", "2026-10-14 16:50", "16", "Cart_Abandonment_Winback"],
    ["U-53390", "ananya.r@gmail.com", "P-1420", "Cotton Bedsheet Set", "2026-10-06 11:08", "24", "Cart_Abandonment_Winback"],
  ],
  matched: 3284,
  segmentName: "Cart abandoners — added to cart, no purchase (30 days)",
};

const TEMPLATE_PREVIEW_ROWS = [
  ["C-10482", "maya.r@northwind.io", "0.82", "3", "9", "2026-11-14", "High"],
  ["C-10519", "j.okafor@lumen.co", "0.64", "12", "6", "2026-12-02", "Medium"],
  ["C-10577", "priya.s@acmeretail.com", "0.31", "41", "2", "2026-11-28", "Low"],
  ["C-10603", "leo.b@finchbank.com", "0.77", "5", "7", "2027-01-09", "High"],
  ["C-10644", "ana.m@verdant.org", "0.58", "19", "4", "2026-12-21", "Medium"],
];
const TEMPLATE_PREVIEW: PreviewResult = {
  columns: [
    "customer_id",
    "email_address",
    "renewal_likelihood_score",
    "days_since_last_login",
    "total_features_used_30d",
    "contract_end_date",
    "engagement_tier",
  ],
  rows: TEMPLATE_PREVIEW_ROWS,
  matched: 4812,
  segmentName: "Renewals due in 90 days — by engagement tier",
};

/**
 * Warehouse segment — build an audience straight from a SQL query against the
 * connected data warehouse. A prompt bar asks Zeno to draft the SQL, the editor
 * holds the query, and "Run preview" shows a sample of the rows it returns.
 */
export default function WarehouseSegmentDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** SAVE was pressed after a preview — the dialog closes either way. */
  onSaved?: (saved: { name: string; userCount: number }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [refreshEnabled, setRefreshEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<"idle" | "running" | "done">("idle");

  // Each open starts from the template query with no preview showing.
  useEffect(() => {
    if (!open) return;
    setPrompt("");
    setSql(DEFAULT_SQL);
    setGenerating(false);
    setPreview("idle");
  }, [open]);

  // Any edit to the query makes an earlier preview stale.
  useEffect(() => {
    setPreview((p) => (p === "done" ? "idle" : p));
  }, [sql]);

  const lineCount = useMemo(() => sql.split("\n").length, [sql]);

  // The sample results follow whichever query is in the editor.
  const result = sql.includes("added_to_cart") ? CART_PREVIEW : TEMPLATE_PREVIEW;

  const generateSql = () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setTimeout(() => {
      setSql(GENERATED_SQL);
      setGenerating(false);
    }, 1200);
  };

  const runPreview = () => {
    setPreview("running");
    setTimeout(() => setPreview("done"), 1200);
  };

  const save = () => {
    onSaved?.({ name: result.segmentName, userCount: result.matched });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(960px,calc(100vw-32px))] max-w-none flex-col gap-0 overflow-hidden rounded-[8px] border-[#DDE2EE] p-0">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-[#E7EBF3] px-6 py-4 pr-12">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] bg-[#EEF3FF] text-[#2459E0]">
            <Database className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <DialogTitle className="font-manrope text-[16px] font-bold text-[#17173A]">
              Warehouse segment
            </DialogTitle>
            <DialogDescription className="mt-0.5 font-manrope text-[12px] text-[#6F6F8D]">
              Build an audience with a SQL query on your data warehouse
            </DialogDescription>
          </div>
        </div>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {/* Refresh status */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] bg-[#F4F8FF] px-3 py-2 font-manrope text-[12px]">
            <span className="flex items-center gap-1.5 text-[#6F6F8D]">
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
              Last refreshed <span className="font-semibold text-[#17173A]">{LAST_REFRESHED}</span>
              {refreshEnabled && (
                <span className="ml-1 rounded-full bg-[#E5F6EE] px-2 py-0.5 text-[11px] font-semibold text-[#14804A]">
                  Auto-refresh on · every 24h
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setRefreshEnabled((v) => !v)}
              className="font-semibold text-[#2459E0] underline-offset-2 hover:underline"
            >
              {refreshEnabled ? "Disable refresh" : "Enable refresh"}
            </button>
          </div>

          {/* Prompt */}
          <label className="mt-4 block font-manrope text-[12px] font-semibold text-[#17173A]">
            Describe your audience
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-[6px] border border-[#DDE2EE] bg-white px-3 py-2 focus-within:border-[#2459E0]">
            <Sparkles className="h-4 w-4 shrink-0 text-[#2459E0]" strokeWidth={1.8} />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateSql()}
              placeholder={`e.g. ${PROMPT_EXAMPLE}`}
              className="min-w-0 flex-1 bg-transparent font-manrope text-[13px] text-[#17173A] outline-none placeholder:text-[#9A9AB0]"
            />
            <button
              type="button"
              onClick={generateSql}
              disabled={!prompt.trim() || generating}
              className="dc-btn dc-btn-secondary-blue h-7 px-3 text-[12px]"
            >
              {generating && <Loader2 className="animate-spin" strokeWidth={2} />}
              {generating ? "Generating…" : "Generate SQL"}
            </button>
          </div>

          {/* SQL editor */}
          <div className="mt-4 flex items-center justify-between">
            <label className="font-manrope text-[12px] font-semibold text-[#17173A]">SQL query</label>
            <span className="font-manrope text-[11px] text-[#6F6F8D]">
              {lineCount} lines · analytics_production
            </span>
          </div>
          <div className="mt-1.5 flex overflow-hidden rounded-[6px] border border-[#2A2F45] bg-[#1B1F2E] focus-within:border-[#2459E0]">
            <div
              aria-hidden
              style={CODE_FONT}
              className="select-none border-r border-[#2A2F45] bg-[#171A27] px-3 py-3 text-right font-mono text-[12px] leading-[20px] text-[#5C6382]"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              style={CODE_FONT}
              rows={lineCount}
              className="min-h-[200px] flex-1 resize-none overflow-x-auto whitespace-pre bg-transparent px-3 py-3 font-mono text-[12px] leading-[20px] text-[#E6E8F2] outline-none"
            />
          </div>

          {/* Preview results */}
          {preview === "done" && (
            <div className="mt-4">
              <div className="flex items-center justify-between font-manrope text-[12px]">
                <span className="font-semibold text-[#17173A]">Preview</span>
                <span className="text-[#6F6F8D]">
                  <span className="font-semibold text-[#17173A]">{result.matched.toLocaleString("en-US")}</span>{" "}
                  users matched · showing {result.rows.length}
                </span>
              </div>
              <div className="mt-1.5 overflow-x-auto rounded-[6px] border border-[#E7EBF3]">
                <table className="w-full font-manrope text-[12px]">
                  <thead className="bg-[#F7F9FC] text-left text-[#6F6F8D]">
                    <tr>
                      {result.columns.map((c) => (
                        <th key={c} className="whitespace-nowrap px-3 py-2 font-mono font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row[0]} className="border-t border-[#EEF1F6] text-[#17173A]">
                        {row.map((v, i) => (
                          <td key={i} className="whitespace-nowrap px-3 py-2">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#E7EBF3] px-6 py-3">
          <button type="button" onClick={() => onOpenChange(false)} className="dc-btn dc-btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={runPreview}
            disabled={!sql.trim() || preview === "running"}
            className={cn("dc-btn dc-btn-secondary-blue", preview === "running" && "cursor-wait")}
          >
            {preview === "running" ? (
              <Loader2 className="animate-spin" strokeWidth={2} />
            ) : (
              <Play strokeWidth={2} />
            )}
            {preview === "running" ? "Running…" : "Run preview"}
          </button>
          {/* Saving needs a preview of the current query first. */}
          <button
            type="button"
            onClick={save}
            disabled={preview !== "done"}
            title={preview !== "done" ? "Run a preview before saving" : undefined}
            className="dc-btn dc-btn-primary"
          >
            <Save strokeWidth={2} />
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
