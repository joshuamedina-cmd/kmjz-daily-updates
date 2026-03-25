import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SECTIONS, type SectionKey } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DraftItem {
  section: SectionKey;
  title: string;
  detail: string;
}

export default function CreateUpdate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<DraftItem[]>([]);

  const addItem = (section: SectionKey) => {
    setItems([...items, { section, title: "", detail: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemField = (index: number, field: "title" | "detail", value: string) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const updateRes = await apiRequest("POST", "/api/updates", {
        date,
        status: "draft",
        createdAt: new Date().toISOString(),
      });
      const update = await updateRes.json();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.title.trim()) continue;
        await apiRequest("POST", "/api/items", {
          updateId: update.id,
          section: item.section,
          title: item.title.trim(),
          detail: item.detail.trim(),
          sortOrder: i,
        });
      }

      return update;
    },
    onSuccess: (update) => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      toast({ title: "Update created" });
      navigate(`/update/${update.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create update", variant: "destructive" });
    },
  });

  const hasItems = items.some((i) => i.title.trim());

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-12">
      <h1 className="text-xl font-semibold tracking-tight mb-10">New Update</h1>

      <div className="mb-10">
        <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Date
        </label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="max-w-[200px] text-[13px]"
          data-testid="input-date"
        />
      </div>

      {SECTIONS.map((section) => {
        const sectionItems = items
          .map((item, idx) => ({ ...item, idx }))
          .filter((item) => item.section === section.key);

        return (
          <div key={section.key} className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${section.dotClass}`} />
                <h2 className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.label}
                </h2>
              </div>
              <button
                onClick={() => addItem(section.key)}
                className="flex items-center gap-1 text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                data-testid={`button-add-${section.key}`}
              >
                <Plus size={13} />
                Add
              </button>
            </div>

            {sectionItems.length === 0 ? (
              <button
                onClick={() => addItem(section.key)}
                className="w-full py-8 border border-dashed border-border/60 rounded-xl text-[13px] text-muted-foreground/50 hover:text-muted-foreground hover:border-border transition-colors"
              >
                Add {section.label.toLowerCase()} item
              </button>
            ) : (
              <div className="space-y-2.5">
                {sectionItems.map(({ idx }) => (
                  <div
                    key={idx}
                    className="border border-border/70 rounded-xl p-4 bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="One-line summary"
                          value={items[idx].title}
                          onChange={(e) => updateItemField(idx, "title", e.target.value)}
                          className="text-[14px] border-0 bg-transparent px-0 h-auto py-0 font-medium focus-visible:ring-0 placeholder:text-muted-foreground/40"
                          data-testid={`input-title-${idx}`}
                        />
                        <Textarea
                          placeholder="Full detail (optional)"
                          value={items[idx].detail}
                          onChange={(e) => updateItemField(idx, "detail", e.target.value)}
                          className="text-[13px] border-0 bg-transparent px-0 min-h-[50px] resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
                          rows={2}
                          data-testid={`input-detail-${idx}`}
                        />
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors rounded-lg"
                        data-testid={`button-remove-${idx}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-6 border-t border-border/50">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!hasItems || createMutation.isPending}
          className="text-[13px] h-10 px-6 rounded-full"
          data-testid="button-create"
        >
          {createMutation.isPending ? "Creating..." : "Create Update"}
        </Button>
      </div>
    </div>
  );
}
