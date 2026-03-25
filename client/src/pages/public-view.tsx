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
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-4">
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
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
          KMJZ Holdings — Daily Update
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          {format(dateObj, "EEEE, MMMM d, yyyy")}
        </h1>
      </div>

      {SECTIONS.map((section) => {
        const sectionItems = data.items.filter((i) => i.section === section.key);
        const sectionFeedback = data.feedback.filter((f) => f.section === section.key);
        if (sectionItems.length === 0) return null;

        return (
          <section key={section.key} className="mb-8">
            <div className="flex items-center gap-2.5 mb-3">
              <span className={`w-2 h-2 rounded-full ${section.dotClass}`} />
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground">
                {section.label}
              </h2>
            </div>
            <div className="space-y-1.5">
              {sectionItems.map((item) => (
                <PublicExpandableItem key={item.id} item={item} />
              ))}
            </div>
            <PublicFeedbackForm updateId={data.id} section={section.key} />
            {sectionFeedback.length > 0 && (
              <div className="mt-3 space-y-2">
                {sectionFeedback.map((fb) => (
                  <div key={fb.id} className="pl-4 border-l-2 border-border py-1.5">
                    <p className="text-[13px] text-foreground">{fb.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {fb.authorName} &middot; {format(parseISO(fb.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

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
      className={`rounded-xl border border-border bg-card overflow-hidden transition-all ${
        hasDetail ? "cursor-pointer" : ""
      }`}
      onClick={() => hasDetail && setOpen(!open)}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[14px] text-foreground font-medium leading-snug">
          {item.title}
        </p>
        {hasDetail && (
          <ChevronDown
            size={15}
            className={`text-muted-foreground transition-transform duration-200 shrink-0 ml-3 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </div>
      {open && hasDetail && (
        <div className="px-4 pb-3.5 pt-0">
          <div className="border-t border-border pt-3">
            <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
