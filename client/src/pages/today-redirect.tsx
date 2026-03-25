import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import type { Update } from "@shared/schema";
import { format, isToday, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function TodayRedirect() {
  const [, navigate] = useLocation();
  const { data: updates, isLoading } = useQuery<Update[]>({
    queryKey: ["/api/updates"],
  });

  useEffect(() => {
    if (!updates || updates.length === 0) return;

    // Find today's update
    const todayUpdate = updates.find((u) => isToday(parseISO(u.date)));
    if (todayUpdate) {
      navigate(`/update/${todayUpdate.id}`, { replace: true });
      return;
    }

    // Otherwise go to the most recent update
    navigate(`/update/${updates[0].id}`, { replace: true });
  }, [updates, navigate]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // No updates exist yet
  if (!updates || updates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[15px] text-muted-foreground">No updates yet</p>
          <Link href="/create">
            <span className="inline-block mt-3 text-[13px] font-medium text-foreground underline underline-offset-4 cursor-pointer">
              Create the first update
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
