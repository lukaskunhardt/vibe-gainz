"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { de } from "date-fns/locale";

export function DateNav({ id }: { id?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateParam = searchParams.get("date");
  const currentDate = useMemo(() => {
    if (dateParam) {
      try {
        return startOfDay(parseISO(dateParam));
      } catch {}
    }
    return startOfDay(new Date());
  }, [dateParam]);

  // Only show on dashboard route
  if (pathname !== "/dashboard") return null;

  const pushDate = (d: Date) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("date", format(d, "yyyy-MM-dd"));
    router.push(`${pathname}?${qs.toString()}`);
  };

  const prev = () => pushDate(addDays(currentDate, -1));
  const next = () => pushDate(addDays(currentDate, 1));

  const isToday = isSameDay(currentDate, startOfDay(new Date()));

  return (
    <div id={id} className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={prev} aria-label="Vorheriger Tag">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="text-sm font-medium tabular-nums">
        <span className="inline md:hidden">
          {format(currentDate, "EEE, d. MMM", { locale: de })}
        </span>
        <span className="hidden md:inline">
          {format(currentDate, "EEEE, d. MMMM yyyy", { locale: de })}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={next}
        disabled={isToday}
        aria-label="Nächster Tag"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
