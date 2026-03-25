import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Send, Calendar, ChevronDown, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

type ParsedItem = {
  section: string;
  title: string;
  detail: string;
};

type ParsedUpdate = {
  date: string;
  items: ParsedItem[];
  publish?: boolean;
};

type ParsedResult = {
  updates: ParsedUpdate[];
};

const SECTION_META: Record<string, { label: string; dot: string; emoji: string }> = {
  urgent: { label: "Urgent", dot: "bg-red-500", emoji: "🔴" },
  major: { label: "Major Tasks", dot: "bg-orange-500", emoji: "🟠" },
  production: { label: "Production", dot: "bg-yellow-500", emoji: "🟡" },
  strategic: { label: "Strategic", dot: "bg-blue-500", emoji: "🔵" },
};

export default function AIEntry() {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Parse raw text with AI
  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/ai/parse", { rawText: text });
      return (await res.json()) as ParsedResult;
    },
    onSuccess: (data) => {
      setParsed(data);
      // Default: publish today's updates, keep future as draft
      const today = new Date().toISOString().split("T")[0];
      data.updates.forEach((u) => {
        u.publish = u.date === today;
      });
    },
    onError: () => {
      toast({ title: "Failed to process notes", description: "Please try again.", variant: "destructive" });
    },
  });

  // Post updates to DB
  const postMutation = useMutation({
    mutationFn: async (updates: ParsedUpdate[]) => {
      const res = await apiRequest("POST", "/api/ai/post-updates", { updates });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      const firstResult = data.results?.[0];
      toast({ title: `${data.results.length} update(s) created` });
      setRawText("");
      setParsed(null);
      if (firstResult?.updateId) {
        navigate(`/update/${firstResult.updateId}`);
      }
    },
    onError: () => {
      toast({ title: "Failed to post updates", variant: "destructive" });
    },
  });

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const togglePublish = (index: number) => {
    if (!parsed) return;
    const next = { ...parsed };
    next.updates = [...next.updates];
    next.updates[index] = { ...next.updates[index], publish: !next.updates[index].publish };
    setParsed(next);
  };

  const removeItem = (updateIdx: number, itemIdx: number) => {
    if (!parsed) return;
    const next = { ...parsed };
    next.updates = [...next.updates];
    next.updates[updateIdx] = {
      ...next.updates[updateIdx],
      items: next.updates[updateIdx].items.filter((_, i) => i !== itemIdx),
    };
    // Remove empty updates
    next.updates = next.updates.filter((u) => u.items.length > 0);
    setParsed(next.updates.length > 0 ? next : null);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center">
            <Sparkles size={18} className="text-foreground/70" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            New Update
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Paste your raw notes. AI will organize them into sections, clean up the text, and detect dates for scheduling.
        </p>
      </div>

      {/* Input area */}
      {!parsed && (
        <div className="space-y-4">
          <Textarea
            placeholder={"Paste your daily notes here...\n\nExample:\nneed to cover 20k rent today, push collections hard. get a kilo ready for wesley by end of day. lock down the filter station config tonight. also for march 28 need to schedule the team review meeting and prep the quarterly numbers..."}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="min-h-[240px] text-base leading-relaxed resize-none rounded-xl border-border/70"
            data-testid="input-raw-notes"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {rawText.length > 0 ? `${rawText.split(/\s+/).filter(Boolean).length} words` : ""}
            </p>
            <Button
              onClick={() => parseMutation.mutate(rawText)}
              disabled={rawText.trim().length < 10 || parseMutation.isPending}
              className="h-10 px-6 rounded-full gap-2 text-sm"
              data-testid="button-process"
            >
              {parseMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Organize with AI
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Preview */}
      {parsed && (
        <div className="space-y-6">
          {/* Back to edit */}
          <button
            onClick={() => setParsed(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-to-edit"
          >
            ← Edit raw notes
          </button>

          {parsed.updates.map((update, uIdx) => {
            const isToday = update.date === today;
            const isFuture = update.date > today;

            return (
              <div
                key={update.date}
                className="rounded-xl border border-border/70 bg-card overflow-hidden"
                data-testid={`preview-update-${update.date}`}
              >
                {/* Update header */}
                <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-muted-foreground" />
                    <div>
                      <span className="text-base font-semibold text-foreground">
                        {formatDate(update.date)}
                      </span>
                      {isToday && (
                        <span className="ml-2 text-xs font-medium text-blue-500 dark:text-blue-400">
                          Today
                        </span>
                      )}
                      {isFuture && (
                        <span className="ml-2 text-xs font-medium text-amber-500 dark:text-amber-400">
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePublish(uIdx)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      update.publish
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    data-testid={`toggle-publish-${update.date}`}
                  >
                    {update.publish ? "Publish" : "Draft"}
                  </button>
                </div>

                {/* Items by section */}
                <div className="p-5 space-y-5">
                  {["urgent", "major", "production", "strategic"].map((sectionKey) => {
                    const sectionItems = update.items.filter((i) => i.section === sectionKey);
                    if (sectionItems.length === 0) return null;
                    const meta = SECTION_META[sectionKey];

                    return (
                      <div key={sectionKey}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {meta.label}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {sectionItems.map((item, iIdx) => {
                            const globalIdx = update.items.indexOf(item);
                            const key = `${uIdx}-${globalIdx}`;
                            const isExpanded = expandedItems.has(key);

                            return (
                              <div
                                key={key}
                                className="rounded-lg border border-border/50 bg-background overflow-hidden"
                              >
                                <div
                                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                                  onClick={() => toggleExpand(key)}
                                >
                                  <p className="text-base font-medium text-foreground leading-snug">
                                    {item.title}
                                  </p>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(uIdx, globalIdx);
                                      }}
                                      className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors"
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                    <ChevronDown
                                      size={14}
                                      className={`text-muted-foreground/50 transition-transform duration-200 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>
                                </div>
                                {isExpanded && item.detail && (
                                  <div className="px-4 pb-3 pt-0">
                                    <div className="border-t border-border/40 pt-3">
                                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {item.detail}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Item count */}
                <div className="px-5 pb-4">
                  <p className="text-xs text-muted-foreground/50">
                    {update.items.length} item{update.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Post button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {parsed.updates.length} update{parsed.updates.length !== 1 ? "s" : ""} ready
              {parsed.updates.some((u) => u.date > today) && (
                <span className="ml-1 text-amber-500 dark:text-amber-400">
                  (includes scheduled)
                </span>
              )}
            </div>
            <Button
              onClick={() => postMutation.mutate(parsed.updates)}
              disabled={postMutation.isPending}
              className="h-10 px-6 rounded-full gap-2 text-sm"
              data-testid="button-post-updates"
            >
              {postMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Post Updates
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-16">
        <PerplexityAttribution />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
