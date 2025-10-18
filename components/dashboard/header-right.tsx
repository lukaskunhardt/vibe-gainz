"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, Users, BarChart2, Settings as SettingsIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function HeaderRight() {
  const [showFull, setShowFull] = useState(true);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const recalc = useCallback(() => {
    const container = document.getElementById("header-grid");
    const brand = document.getElementById("header-brand");
    const dateWrap = document.getElementById("header-date");
    const nav = measureRef.current;
    if (!container || !brand || !dateWrap || !nav) return;

    const containerRect = container.getBoundingClientRect();
    const computed = window.getComputedStyle(container);
    const padL = parseFloat(computed.paddingLeft || "0");
    const padR = parseFloat(computed.paddingRight || "0");

    const availableWidth = containerRect.width - padL - padR;
    const brandW = brand.getBoundingClientRect().width;
    const dateW = dateWrap.getBoundingClientRect().width;
    const navW = nav.scrollWidth;

    // Extra safety margin for gaps
    const margin = 24; // px
    const needed = brandW + dateW + navW + margin;
    setShowFull(needed <= availableWidth);
  }, []);

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    const container = document.getElementById("header-grid");
    const brand = document.getElementById("header-brand");
    const dateWrap = document.getElementById("header-date");
    const nav = measureRef.current;
    if (container) ro.observe(container);
    if (brand) ro.observe(brand);
    if (dateWrap) ro.observe(dateWrap);
    if (nav) ro.observe(nav);
    window.addEventListener("resize", recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [recalc]);

  const FullNavContent = (
    <div className="flex items-center gap-4">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/friends">
        <Button variant="ghost" size="sm">
          <Users className="mr-2 h-4 w-4" />
          Friends
        </Button>
      </Link>
      <Link href="/stats">
        <Button variant="ghost" size="sm">
          <BarChart2 className="mr-2 h-4 w-4" />
          Stats
        </Button>
      </Link>
      <Link href="/settings">
        <Button variant="ghost" size="sm">
          <SettingsIcon className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </Link>
    </div>
  );

  const Burger = (
    <div className="flex items-center">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="mt-8 flex flex-col gap-4 px-4">
            <SheetClose asChild>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/stats">
                <Button variant="ghost" className="w-full justify-start">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  Stats
                </Button>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/friends">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Friends
                </Button>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/settings">
                <Button variant="ghost" className="w-full justify-start">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </SheetClose>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      {/* Hidden measurement node to avoid thrashing */}
      <div
        className="pointer-events-none absolute left-[-9999px] top-0 -z-50 opacity-0"
        ref={measureRef}
      >
        {FullNavContent}
      </div>
      {showFull ? FullNavContent : Burger}
    </>
  );
}
