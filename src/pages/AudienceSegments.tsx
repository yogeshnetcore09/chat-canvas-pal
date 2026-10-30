import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import L1Nav from "@/components/campaigns/L1Nav";
import TopNav from "@/components/campaigns/TopNav";
import PageHeader from "@/components/campaigns/PageHeader";
import SegmentTable, { WarehouseSegmentTable } from "@/components/campaigns/SegmentTable";
import TabBar from "@/components/campaigns/TabBar";
import SegmentSuggestions from "@/components/campaigns/SegmentSuggestions";
import Pagination from "@/components/campaigns/Pagination";
import ChatInterface from "@/components/ChatInterface";
import MarketingAgentsOverlay from "@/components/MarketingAgentsOverlay";
import SegmentCreationOverlay, {
  type ReviewSegmentContext,
} from "@/components/campaigns/segment-creation/SegmentCreationOverlay";
import { marketingAgents } from "@/data/agents";
import {
  segments as storedSegments,
  warehouseSegments as storedWarehouseSegments,
  type Segment,
  type WarehouseSegment,
} from "@/components/campaigns/segments.data";
import WarehouseSegmentDialog from "@/components/campaigns/segment-creation/WarehouseSegmentDialog";
import { toast } from "sonner";
import { Database, Users } from "lucide-react";

function formatSegmentStamp(d = new Date()) {
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

function toTableSegment(
  saved: { name: string; count: string; aiGenerated: boolean },
  existing: Segment[]
): Segment {
  const nextId =
    Math.max(0, ...storedSegments.map((s) => s.id), ...existing.map((s) => s.id)) + 1;
  const users = Number(String(saved.count).replace(/,/g, "")) || 0;
  const stamp = formatSegmentStamp();
  return {
    id: nextId,
    name: saved.name,
    createdOn: stamp,
    refreshedOn: stamp,
    userCount: users,
    email: users,
    sms: Math.round(users * 0.95),
    appPush: 0,
    webPush: 0,
    aiGenerated: saved.aiGenerated,
  };
}

/**
 * Audience → Segments listing page, reached from the Segments row of the
 * Audience L2 flyout. Deliberately the same shell as <Campaigns/> — L1 rail,
 * top bar, page header, tab strip + toolbar, table, pagination — with the L1
 * rail sitting on Audience and the L2 drawer highlighting Segments.
 */
export default function AudienceSegments() {
  const [chatOpen, setChatOpen] = useState(false);
  // `chatMounted` keeps the docked column in the DOM while its exit animation
  // plays; `chatIn` drives the enter/leave transition (slide + fade + width).
  const [chatMounted, setChatMounted] = useState(false);
  const [chatIn, setChatIn] = useState(false);
  // Bumped on every open so <ChatInterface/> remounts fresh.
  const [chatSession, setChatSession] = useState(0);
  const [isAgentsOverlayOpen, setIsAgentsOverlayOpen] = useState(false);
  const [enabledAgents, setEnabledAgents] = useState<Set<string>>(new Set());
  // "Review segment" on the Segment agent's artifact card in the page-level chat
  // — opens the creation canvas on that card's rules. Cleared when it closes.
  const [reviewSegment, setReviewSegment] = useState<ReviewSegmentContext | null>(null);
  // A prompt card was tapped: we go straight to the segment creation page and
  // hand it the ask, so the co-marketer works on it there rather than here.
  const [creationPrompt, setCreationPrompt] = useState<string>();
  // Segments saved from the canvas this session — they head the table, above the
  // stored rows, so the user lands back on the thing they just made.
  const [createdSegments, setCreatedSegments] = useState<Segment[]>([]);
  // Create → "Netcore segment" opens the creation canvas blank; "Warehouse
  // segment" opens the SQL editor instead.
  const [blankCreationOpen, setBlankCreationOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  // Listing tab: 0 = Netcore segments, 1 = Warehouse segments.
  const [segmentTab, setSegmentTab] = useState(0);
  const [createdWarehouseSegments, setCreatedWarehouseSegments] = useState<WarehouseSegment[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  // The route state already turned into a table row — see the effect below.
  const consumedState = useRef<unknown>(null);

  // Coordinate mount → enter and leave → unmount so both directions animate.
  useEffect(() => {
    if (chatOpen) {
      setChatMounted(true);
      setChatSession((n) => n + 1);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setChatIn(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setChatIn(false);
    if (isAgentsOverlayOpen) setIsAgentsOverlayOpen(false);
  }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * A prompt card was tapped — open the segment creation page with the ask
   * already in front of the co-marketer there. The user lands on the canvas
   * they're about to fill, with the agent working beside it.
   */
  const openSegmentAgent = (prompt: string) => {
    setCreationPrompt(prompt);
  };

  /**
   * SAVE on the creation canvas — the canvas closes, the user is back on this
   * list with their new segment at the top of it, and a toast confirms it.
   */
  const handleSegmentSaved = (saved: {
    name: string;
    count: string;
    aiGenerated: boolean;
  }) => {
    setCreatedSegments((prev) => [toTableSegment(saved, prev), ...prev]);
    toast.success("Segment created successfully", {
      description: `${saved.name} · ${saved.count} contacts`,
    });
  };

  /**
   * SAVE in the warehouse SQL dialog — the new segment heads the Warehouse
   * segments tab, which is brought forward so the user sees it land.
   */
  const handleWarehouseSegmentSaved = (saved: { name: string; userCount: number }) => {
    const stamp = formatSegmentStamp();
    setCreatedWarehouseSegments((prev) => [
      {
        id:
          Math.max(0, ...storedWarehouseSegments.map((s) => s.id), ...prev.map((s) => s.id)) + 1,
        name: saved.name,
        createdOn: stamp,
        refreshedOn: stamp,
        userCount: saved.userCount,
      },
      ...prev,
    ]);
    setSegmentTab(1);
    toast.success("Warehouse segment saved", {
      description: `${saved.name} · ${saved.userCount.toLocaleString("en-US")} users`,
    });
  };

  /**
   * Arrived from a segment canvas on another page (the AI dashboard builds its
   * segment in its own content column, so the chat that produced it survives).
   * The saved segment rides in on route state — land it at the top of the table
   * and confirm it exactly as a save from this page's own canvas would.
   *
   * The route state is then cleared so a refresh or a back-navigation can't
   * re-add it, and `consumedState` guards the window before that lands: the
   * effect is re-run on the same state by StrictMode's double-invoke, which
   * would otherwise list the segment twice.
   */
  useEffect(() => {
    const saved = (
      location.state as { createdSegment?: Parameters<typeof handleSegmentSaved>[0] } | null
    )?.createdSegment;
    if (!saved || consumedState.current === location.state) return;
    consumedState.current = location.state;
    handleSegmentSaved(saved);
    navigate(".", { replace: true, state: null });
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleAgent = (agentId: string, agentName: string) => {
    const agent = marketingAgents.find((a) => a.id === agentId);
    if (!agent) return;

    setEnabledAgents((prev) => {
      const next = new Set(prev);
      const isJoining = !next.has(agentId);
      if (isJoining) next.add(agentId);
      else next.delete(agentId);

      window.dispatchEvent(
        new CustomEvent("agentStatusChange", {
          detail: {
            name: agentName,
            status: isJoining ? "join" : "leave",
            icon: agent.icon,
            colorClass: agent.colorClass,
          },
        })
      );
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F4F8FF]">
      <L1Nav active="audience" activeAudienceItem="segments" />

      <div className="flex min-w-0 flex-1 flex-col p-2">
        <TopNav onOpenChat={() => setChatOpen(true)} showCoMarketerNudge={false} />

        <div className="mt-2 flex min-h-0 flex-1 gap-2">
          {/* Segments content */}
          <div className="scroll-slim min-w-0 flex-1 overflow-y-auto px-2 pt-4">
            <PageHeader
              title="Segments"
              subtitle="View and manage segments"
              ctaLabel="Create"
              showCtaChevron={false}
              showCtaAiIcon
              ctaOptions={[
                {
                  label: "Netcore segment",
                  description: "Build with rules on your Netcore data",
                  icon: Users,
                  onSelect: () => setBlankCreationOpen(true),
                },
                {
                  label: "Warehouse segment",
                  description: "Build with a SQL query on your data warehouse",
                  icon: Database,
                  onSelect: () => setWarehouseOpen(true),
                },
              ]}
            />

            {/* Segments has no status tabs and no table-properties toolbar —
                the co-marketer prompt strip sits directly above the table. */}
            <div className="mt-5">
              <SegmentSuggestions onSelect={openSegmentAgent} />
            </div>

            <div className="mt-5 border-b border-[#DDE2EE]">
              <TabBar
                tabs={[{ label: "Netcore segments" }, { label: "Warehouse segments" }]}
                active={segmentTab}
                onChange={setSegmentTab}
              />
            </div>

            <div className={cn("mt-4", segmentTab === 1 && "pb-8")}>
              {segmentTab === 0 ? (
                <SegmentTable extra={createdSegments} />
              ) : (
                <WarehouseSegmentTable extra={createdWarehouseSegments} />
              )}
            </div>

            {segmentTab === 0 && (
              <div className="mt-4 pb-8">
                <Pagination unitLabel="segments" />
              </div>
            )}
          </div>

          {/* Co-marketer chat — docked third column */}
          {chatMounted && (
            <div
              className={cn(
                "flex h-full min-h-0 shrink-0 justify-end overflow-hidden pr-1",
                "transition-[width,opacity] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                "motion-reduce:transition-none",
                chatIn ? "w-[474px] opacity-100" : "w-0 opacity-0"
              )}
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && e.propertyName === "width" && !chatIn) {
                  setChatMounted(false);
                }
              }}
            >
              <MarketingAgentsOverlay
                isOpen={isAgentsOverlayOpen}
                onOpenChange={setIsAgentsOverlayOpen}
                enabledAgents={enabledAgents}
                onToggleAgent={handleToggleAgent}
              />
              <ChatInterface
                key={chatSession}
                initialExpanded={false}
                docked
                conversationVariant="segments"
                onBotIconClick={() => setIsAgentsOverlayOpen(true)}
                enabledAgents={enabledAgents}
                setEnabledAgents={setEnabledAgents}
                onCloseInterface={() => setChatOpen(false)}
                onReviewArtifact={(card) =>
                  setReviewSegment({ title: card.title, description: card.description })
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Segment creation page.
          • From a prompt card: opens empty with the co-marketer docked on its
            right, already answering — the rules land once the user reviews.
          • From "Review segment" in the page-level chat: opens straight onto
            that card's rules, with the thread still docked underneath. */}
      <SegmentCreationOverlay
        open={reviewSegment !== null || creationPrompt !== undefined || blankCreationOpen}
        segment={reviewSegment}
        initialPrompt={creationPrompt}
        onSaved={handleSegmentSaved}
        onClose={() => {
          setReviewSegment(null);
          setCreationPrompt(undefined);
          setBlankCreationOpen(false);
        }}
      />

      <WarehouseSegmentDialog
        open={warehouseOpen}
        onOpenChange={setWarehouseOpen}
        onSaved={handleWarehouseSegmentSaved}
      />
    </div>
  );
}
