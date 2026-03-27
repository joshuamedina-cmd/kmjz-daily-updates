import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  Sparkles, Send, Loader2, Trash2, Pencil, Check, X,
  Gauge, BarChart3, DollarSign, TrendingUp, TrendingDown,
  Plus, Settings2, ChevronDown,
} from "lucide-react";
import type { Update, UpdateItem } from "@shared/schema";

const SECTION_META: Record<string, { label: string; dot: string }> = {
  urgent: { label: "Urgent", dot: "bg-red-500" },
  major: { label: "Major Tasks", dot: "bg-orange-500" },
  production: { label: "Production", dot: "bg-yellow-500" },
  strategic: { label: "Strategic", dot: "bg-blue-500" },
};

type ParsedItem = { section: string; title: string; detail: string };
type ParsedUpdate = { date: string; items: ParsedItem[]; publish?: boolean };

export default function ControlPanel() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"updates" | "gauges" | "items">("updates");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center">
            <Settings2 size={18} className="text-foreground/70" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Control Panel</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Post updates, adjust gauges, and manage items — all from here.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-xl" data-testid="control-tabs">
        {(["updates", "gauges", "items"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab === "updates" ? "Post Update" : tab === "gauges" ? "Gauges" : "Edit Items"}
          </button>
        ))}
      </div>

      {activeTab === "updates" && <UpdatesTab />}
      {activeTab === "gauges" && <GaugesTab />}
      {activeTab === "items" && <ItemsTab />}

      <div className="mt-16">
        <PerplexityAttribution />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 1: POST UPDATES (AI text entry)
   ═══════════════════════════════════════════════ */
function UpdatesTab() {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<{ updates: ParsedUpdate[] } | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/ai/parse", { rawText: text });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setParsed(data);
      const today = new Date().toISOString().split("T")[0];
      data.updates.forEach((u: ParsedUpdate) => { u.publish = u.date === today; });
    },
    onError: () => {
      toast({ title: "Failed to process notes", variant: "destructive" });
    },
  });

  const postMutation = useMutation({
    mutationFn: async (updates: ParsedUpdate[]) => {
      const res = await apiRequest("POST", "/api/ai/post-updates", { updates });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      toast({ title: `${data.results.length} update(s) posted` });
      setRawText("");
      setParsed(null);
      const first = data.results?.[0];
      if (first?.updateId) navigate(`/update/${first.updateId}`);
    },
    onError: () => {
      toast({ title: "Failed to post updates", variant: "destructive" });
    },
  });

  if (parsed) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setParsed(null)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to edit
        </button>

        {parsed.updates.map((update, uIdx) => (
          <div key={update.date} className="rounded-xl border border-border/70 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <span className="text-base font-semibold">{formatDate(update.date)}</span>
              <button
                onClick={() => {
                  const next = { ...parsed };
                  next.updates = [...next.updates];
                  next.updates[uIdx] = { ...next.updates[uIdx], publish: !next.updates[uIdx].publish };
                  setParsed(next);
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  update.publish
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {update.publish ? "Publish" : "Draft"}
              </button>
            </div>
            <div className="p-4 space-y-2">
              {update.items.map((item, iIdx) => {
                const meta = SECTION_META[item.section];
                return (
                  <div key={iIdx} className="flex items-start gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${meta?.dot || "bg-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.title}</span>
                      {item.detail && (
                        <p className="text-muted-foreground text-xs mt-0.5">{item.detail}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const next = { ...parsed };
                        next.updates = [...next.updates];
                        next.updates[uIdx] = {
                          ...next.updates[uIdx],
                          items: next.updates[uIdx].items.filter((_, i) => i !== iIdx),
                        };
                        next.updates = next.updates.filter((u) => u.items.length > 0);
                        setParsed(next.updates.length > 0 ? next : null);
                      }}
                      className="text-muted-foreground/40 hover:text-destructive shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => postMutation.mutate(parsed.updates)}
            disabled={postMutation.isPending}
            className="h-10 px-6 rounded-full gap-2"
            data-testid="button-post"
          >
            {postMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Posting...</>
            ) : (
              <><Send size={16} /> Post Updates</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Textarea
        placeholder={"Type your update notes here...\n\nExample:\ndelivered 15 kilos to wes krave. biomass filter press works. extreme financial pressure from chatsworth landlord. reaching out to al's lawyer soon."}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        className="min-h-[200px] text-base leading-relaxed resize-none rounded-xl border-border/70"
        data-testid="input-raw-notes"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {rawText.length > 0 ? `${rawText.split(/\s+/).filter(Boolean).length} words` : ""}
        </p>
        <Button
          onClick={() => parseMutation.mutate(rawText)}
          disabled={rawText.trim().length < 10 || parseMutation.isPending}
          className="h-10 px-6 rounded-full gap-2"
          data-testid="button-process"
        >
          {parseMutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Processing...</>
          ) : (
            <><Sparkles size={16} /> Organize & Post</>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 2: GAUGES
   ═══════════════════════════════════════════════ */
function GaugesTab() {
  const { toast } = useToast();
  const { data: gauges, isLoading } = useQuery<any>({ queryKey: ["/api/gauges"] });

  const [production, setProduction] = useState<string>("");
  const [financialHealth, setFinancialHealth] = useState<string>("");
  const [sales, setSales] = useState<string>("");
  const [arMovementAmt, setArMovementAmt] = useState("");
  const [arMovementDir, setArMovementDir] = useState("up");
  const [apMovementAmt, setApMovementAmt] = useState("");
  const [apMovementDir, setApMovementDir] = useState("down");
  const [initialized, setInitialized] = useState(false);

  // Sync form state once data loads
  if (gauges && !initialized) {
    setProduction(String(gauges.production ?? 7.4));
    setFinancialHealth(String(gauges.financialHealth ?? 1));
    setSales(String(gauges.sales ?? 100));
    setArMovementAmt(gauges.arMovement?.amount ?? "$48K");
    setArMovementDir(gauges.arMovement?.direction ?? "up");
    setApMovementAmt(gauges.apMovement?.amount ?? "$72K");
    setApMovementDir(gauges.apMovement?.direction ?? "down");
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("PATCH", "/api/gauges", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gauges"] });
      toast({ title: "Gauges updated" });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      production: parseFloat(production) || 7.4,
      financialHealth: parseInt(financialHealth) || 1,
      sales: parseInt(sales) || 100,
      arMovement: { direction: arMovementDir, amount: arMovementAmt, label: "14 day movement" },
      apMovement: { direction: apMovementDir, amount: apMovementAmt, label: "14 day movement" },
    });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading gauges...</div>;

  return (
    <div className="space-y-5">
      {/* Production */}
      <GaugeRow
        icon={<Gauge size={18} />}
        label="Daily Production"
        sublabel="kilos/day (1-30)"
      >
        <Input
          type="number"
          step="0.1"
          min="1"
          max="30"
          value={production}
          onChange={(e) => setProduction(e.target.value)}
          className="w-24 h-9 text-center rounded-lg"
          data-testid="input-production"
        />
      </GaugeRow>

      {/* Financial Health */}
      <GaugeRow
        icon={<BarChart3 size={18} />}
        label="Financial Health"
        sublabel="Level 1 (CRITICAL) to 9"
      >
        <Input
          type="number"
          min="1"
          max="9"
          value={financialHealth}
          onChange={(e) => setFinancialHealth(e.target.value)}
          className="w-24 h-9 text-center rounded-lg"
          data-testid="input-financial-health"
        />
      </GaugeRow>

      {/* Sales */}
      <GaugeRow
        icon={<DollarSign size={18} />}
        label="Sales"
        sublabel="0-100%"
      >
        <Input
          type="number"
          min="0"
          max="100"
          value={sales}
          onChange={(e) => setSales(e.target.value)}
          className="w-24 h-9 text-center rounded-lg"
          data-testid="input-sales"
        />
      </GaugeRow>

      {/* AR Movement */}
      <GaugeRow
        icon={<TrendingUp size={18} />}
        label="AR 14-Day Movement"
        sublabel="Direction and amount"
      >
        <div className="flex items-center gap-2">
          <select
            value={arMovementDir}
            onChange={(e) => setArMovementDir(e.target.value)}
            className="h-9 px-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="up">↑ Up</option>
            <option value="down">↓ Down</option>
          </select>
          <Input
            value={arMovementAmt}
            onChange={(e) => setArMovementAmt(e.target.value)}
            className="w-24 h-9 text-center rounded-lg"
            placeholder="$48K"
          />
        </div>
      </GaugeRow>

      {/* AP Movement */}
      <GaugeRow
        icon={<TrendingDown size={18} />}
        label="AP 14-Day Movement"
        sublabel="Direction and amount"
      >
        <div className="flex items-center gap-2">
          <select
            value={apMovementDir}
            onChange={(e) => setApMovementDir(e.target.value)}
            className="h-9 px-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="down">↓ Down</option>
            <option value="up">↑ Up</option>
          </select>
          <Input
            value={apMovementAmt}
            onChange={(e) => setApMovementAmt(e.target.value)}
            className="w-24 h-9 text-center rounded-lg"
            placeholder="$72K"
          />
        </div>
      </GaugeRow>

      <div className="pt-3">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="h-10 px-8 rounded-full gap-2 w-full sm:w-auto"
          data-testid="button-save-gauges"
        >
          {saveMutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Check size={16} /> Save Gauges</>
          )}
        </Button>
      </div>
    </div>
  );
}

function GaugeRow({ icon, label, sublabel, children }: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border/50 bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-muted-foreground shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 3: EDIT ITEMS
   ═══════════════════════════════════════════════ */
function ItemsTab() {
  const { toast } = useToast();
  const { data: updates } = useQuery<Update[]>({ queryKey: ["/api/updates"] });

  // Default to latest update
  const latestUpdate = updates?.[0];
  const [selectedUpdateId, setSelectedUpdateId] = useState<number | null>(null);
  const activeId = selectedUpdateId ?? latestUpdate?.id;

  const { data: updateData, isLoading } = useQuery<any>({
    queryKey: ["/api/updates", activeId],
    enabled: !!activeId,
  });

  const items: UpdateItem[] = updateData?.items || [];

  // Add item state
  const [addingSection, setAddingSection] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDetail, setNewDetail] = useState("");

  // Edit item state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/items", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates", activeId] });
      setAddingSection(null);
      setNewTitle("");
      setNewDetail("");
      toast({ title: "Item added" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/items/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates", activeId] });
      setEditingId(null);
      toast({ title: "Item updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates", activeId] });
      toast({ title: "Item deleted" });
    },
  });

  if (!updates?.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No updates yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Update selector */}
      <div className="flex items-center gap-2">
        <select
          value={activeId ?? ""}
          onChange={(e) => setSelectedUpdateId(parseInt(e.target.value))}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm flex-1"
          data-testid="select-update"
        >
          {updates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.date} {u.status === "draft" ? "(draft)" : ""}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}

      {/* Items by section */}
      {["urgent", "major", "production", "strategic"].map((sectionKey) => {
        const sectionItems = items.filter((i) => i.section === sectionKey);
        const meta = SECTION_META[sectionKey];

        return (
          <div key={sectionKey}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground/50">{sectionItems.length}</span>
              </div>
              <button
                onClick={() => {
                  setAddingSection(addingSection === sectionKey ? null : sectionKey);
                  setNewTitle("");
                  setNewDetail("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid={`button-add-${sectionKey}`}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {/* Add form */}
            {addingSection === sectionKey && (
              <div className="rounded-lg border border-border/70 bg-card p-3 mb-2 space-y-2">
                <Input
                  placeholder="Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-9 text-sm rounded-lg"
                  autoFocus
                />
                <Textarea
                  placeholder="Detail (optional)"
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  className="min-h-[60px] text-sm resize-none rounded-lg"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddingSection(null)}
                    className="h-8 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!newTitle.trim() || addMutation.isPending}
                    onClick={() => {
                      addMutation.mutate({
                        updateId: activeId,
                        section: sectionKey,
                        title: newTitle.trim(),
                        detail: newDetail.trim(),
                        sortOrder: sectionItems.length,
                      });
                    }}
                    className="h-8 rounded-lg gap-1"
                  >
                    {addMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Existing items */}
            <div className="space-y-1.5 mb-4">
              {sectionItems.length === 0 && addingSection !== sectionKey && (
                <p className="text-xs text-muted-foreground/40 py-1 px-1">No items</p>
              )}
              {sectionItems.map((item) => {
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <div key={item.id} className="rounded-lg border border-blue-500/30 bg-card p-3 space-y-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-9 text-sm rounded-lg"
                        autoFocus
                      />
                      <Textarea
                        value={editDetail}
                        onChange={(e) => setEditDetail(e.target.value)}
                        className="min-h-[60px] text-sm resize-none rounded-lg"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="h-8 rounded-lg"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!editTitle.trim() || editMutation.isPending}
                          onClick={() => {
                            editMutation.mutate({
                              id: item.id,
                              data: { title: editTitle.trim(), detail: editDetail.trim() },
                            });
                          }}
                          className="h-8 rounded-lg gap-1"
                        >
                          {editMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="group flex items-start gap-2 py-2 px-3 rounded-lg border border-border/40 bg-card hover:border-border/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      {item.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.detail}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditTitle(item.title);
                          setEditDetail(item.detail || "");
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this item?")) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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
