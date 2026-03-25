import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Update, UpdateItem, Feedback } from "@shared/schema";
import { SECTIONS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ChevronDown, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import DashboardGauges from "@/components/DashboardGauges";

type FullUpdate = Update & { items: UpdateItem[]; feedback: Feedback[] };

export default function PublicView() {
  const [, params] = useRoute("/view/:id");
  const id = params?.id;

  const { data, isLoading } = useQuery<FullUpdate>({
    queryKey: ["/api/updates", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-10 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data || data.status !== "published") {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 text-center">
        <p className="text-muted-foreground text-sm">Update not available</p>
      </div>
    );
  }

  const dateObj = parseISO(data.date);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 md:py-10">
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
          KMJZ Holdings — Daily Update
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {format(dateObj, "EEEE, MMMM d, yyyy")}
        </h1>
      </div>

      {/* Two-column split: Gauges | Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 items-start">
        {/* Left: Dashboard gauges */}
        <div className="lg:sticky lg:top-8">
          <DashboardGauges />
        </div>

        {/* Right: Update sections */}
        <div>
          {SECTIONS.map((section) => {
            const sectionItems = data.items.filter((i) => i.section === section.key);
            const sectionFeedback = data.feedback.filter((f) => f.section === section.key);
            if (sectionItems.length === 0) return null;

            return (
              <section key={section.key} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${section.dotClass}`} />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    {section.label}
                  </h2>
                  {sectionFeedback.length > 0 && (
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                      <MessageSquare size={12} />
                      {sectionFeedback.length}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {sectionItems.map((item) => (
                    <PublicExpandableItem key={item.id} item={item} />
                  ))}
                </div>
                <PublicFeedbackForm updateId={data.id} section={section.key} />
                {sectionFeedback.length > 0 && (
                  <div className="mt-4 space-y-3 ml-1">
                    {sectionFeedback.map((fb) => (
                      <div key={fb.id} className="pl-5 border-l-2 border-border/60 py-1">
                        <p className="text-base text-foreground leading-relaxed">{fb.message}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {fb.authorName} &middot; {format(parseISO(fb.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {data.items.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-base">No items in this update</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16">
        <PerplexityAttribution />
      </div>
    </div>
  );
}

function PublicExpandableItem({ item }: { item: UpdateItem }) {
  const [open, setOpen] = useState(false);
  const hasDetail = item.detail && item.detail.trim().length > 0;

  return (
    <div
      className={`rounded-xl border border-border/70 bg-card overflow-hidden transition-all ${
        hasDetail ? "cursor-pointer hover:border-border" : ""
      }`}
      onClick={() => hasDetail && setOpen(!open)}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-lg font-medium leading-snug text-foreground">
          {item.title}
        </p>
        {hasDetail && (
          <ChevronDown
            size={18}
            className={`text-muted-foreground/50 transition-transform duration-200 shrink-0 ml-4 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </div>
      {open && hasDetail && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-border/50 pt-4">
            <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {item.detail}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicFeedbackForm({ updateId, section }: { updateId: number; section: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/updates/${updateId}/feedback`, {
        section,
        authorName: name.trim(),
        authorEmail: email.trim(),
        message: message.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates", String(updateId)] });
      setMessage("");
      setOpen(false);
      toast({ title: "Feedback sent — thank you" });
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <MessageSquare size={12} />
        Leave feedback
      </button>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-xl border border-border bg-card space-y-2.5">
      <div className="flex gap-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-[13px] h-8"
        />
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-[13px] h-8"
        />
      </div>
      <Textarea
        placeholder="Your feedback on this section..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="text-[13px] min-h-[60px] resize-none"
        rows={2}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || !email.trim() || !message.trim() || mutation.isPending}
          className="text-[12px] h-7 rounded-full px-4"
        >
          <Send size={12} className="mr-1" />
          {mutation.isPending ? "Sending..." : "Send"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="text-[12px] h-7 rounded-full px-4"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
