import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Update, UpdateItem, Feedback } from "@shared/schema";
import { SECTIONS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ChevronDown, Send, MessageSquare, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import DashboardGauges from "@/components/DashboardGauges";

type FullUpdate = Update & { items: UpdateItem[]; feedback: Feedback[] };

export default function ViewUpdate() {
  const [, params] = useRoute("/update/:id");
  const { toast } = useToast();
  const id = params?.id;

  const { data, isLoading } = useQuery<FullUpdate>({
    queryKey: ["/api/updates", id],
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/updates/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      toast({ title: "Published and ready to share" });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-base">Update not found</p>
      </div>
    );
  }

  const dateObj = parseISO(data.date);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}#/view/${data.id}`
    : "";

  const sectionLabels: Record<string, string> = {
    urgent: "🔴 URGENT",
    major: "🟠 MAJOR",
    production: "🟡 PRODUCTION",
    strategic: "🔵 STRATEGIC",
  };

  const textSummary = data.items.reduce((acc, item) => {
    const label = sectionLabels[item.section] || item.section;
    return acc + `${label}: ${item.title}\n`;
  }, `KMJZ Update — ${format(dateObj, "MMM d")}\n\n`) + `\n${shareUrl}`;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {format(dateObj, "EEEE, MMMM d")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(dateObj, "yyyy")}
            {data.status === "draft" && (
              <span className="ml-2 text-muted-foreground/60">&middot; Draft</span>
            )}
          </p>
        </div>
        {data.status === "draft" && (
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className="text-sm h-10 px-6 rounded-full"
            data-testid="button-publish"
          >
            {publishMutation.isPending ? "Publishing..." : "Publish"}
          </Button>
        )}
      </div>

      {/* Action bar */}
      {data.status === "published" && (
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-border">
          <CopyLinkButton url={shareUrl} />
        </div>
      )}

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
              <SectionBlock
                key={section.key}
                sectionKey={section.key}
                label={section.label}
                dotClass={section.dotClass}
                items={sectionItems}
                feedback={sectionFeedback}
                updateId={data.id}
                isPublished={data.status === "published"}
              />
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

function SectionBlock({
  sectionKey,
  label,
  dotClass,
  items,
  feedback,
  updateId,
  isPublished,
}: {
  sectionKey: string;
  label: string;
  dotClass: string;
  items: UpdateItem[];
  feedback: Feedback[];
  updateId: number;
  isPublished: boolean;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </h2>
        {feedback.length > 0 && (
          <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
            <MessageSquare size={12} />
            {feedback.length}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <ExpandableItem key={item.id} item={item} />
        ))}
      </div>
      {isPublished && (
        <FeedbackForm updateId={updateId} section={sectionKey} />
      )}
      {feedback.length > 0 && (
        <div className="mt-4 space-y-3 ml-1">
          {feedback.map((fb) => (
            <div
              key={fb.id}
              className="pl-5 border-l-2 border-border/60 py-1"
            >
              <p className="text-base text-foreground leading-relaxed">{fb.message}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {fb.authorName} &middot;{" "}
                {format(parseISO(fb.createdAt), "MMM d, h:mm a")}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExpandableItem({ item }: { item: UpdateItem }) {
  const [open, setOpen] = useState(false);
  const hasDetail = item.detail && item.detail.trim().length > 0;

  return (
    <div
      className={`rounded-xl border border-border/70 bg-card overflow-hidden transition-all ${
        hasDetail ? "cursor-pointer hover:border-border" : ""
      }`}
      onClick={() => hasDetail && setOpen(!open)}
      data-testid={`item-${item.id}`}
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

function FeedbackForm({ updateId, section }: { updateId: number; section: string }) {
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
      toast({ title: "Feedback sent" });
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1.5"
        data-testid={`button-feedback-${section}`}
      >
        <MessageSquare size={14} />
        Leave feedback
      </button>
    );
  }

  return (
    <div className="mt-4 p-5 rounded-xl border border-border/70 bg-card space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-sm h-9"
          data-testid={`input-fb-name-${section}`}
        />
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-sm h-9"
          data-testid={`input-fb-email-${section}`}
        />
      </div>
      <Textarea
        placeholder="Your feedback on this section..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="text-sm min-h-[70px] resize-none"
        rows={2}
        data-testid={`input-fb-message-${section}`}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || !email.trim() || !message.trim() || mutation.isPending}
          className="text-sm h-8 rounded-full px-5"
          data-testid={`button-fb-submit-${section}`}
        >
          <Send size={13} className="mr-1.5" />
          {mutation.isPending ? "Sending..." : "Send"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="text-sm h-8 rounded-full px-5"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      onClick={copy}
      className="text-sm h-10 px-5 rounded-full gap-2 border-border/70"
      data-testid="button-copy-link"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied" : "Copy Link"}
    </Button>
  );
}

function SmsButton({ text }: { text: string }) {
  const encoded = encodeURIComponent(text);
  const smsUrl = `sms:?body=${encoded}`;

  return (
    <Button
      variant="outline"
      asChild
      className="text-sm h-10 px-5 rounded-full gap-2 border-border/70"
    >
      <a href={smsUrl} data-testid="button-sms">
        <Smartphone size={16} />
        Text Update
      </a>
    </Button>
  );
}

function EmailPartnersButton({ updateId, shareUrl }: { updateId: number; shareUrl: string }) {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/updates/${updateId}/email-partners`, { shareUrl });
      return await res.json();
    },
    onSuccess: (data) => {
      const emails = data.partners.join(",");
      const subject = encodeURIComponent(data.subject);
      const body = encodeURIComponent(data.textBody);
      window.open(`mailto:${emails}?subject=${subject}&body=${body}`, "_self");
      setSent(true);
      toast({ title: "Email client opened" });
      setTimeout(() => setSent(false), 3000);
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="text-sm h-10 px-5 rounded-full gap-2 border-border/70"
      data-testid="button-email-partners"
    >
      <Mail size={16} />
      {sent ? "Sent" : mutation.isPending ? "Preparing..." : "Email Partners"}
    </Button>
  );
}
