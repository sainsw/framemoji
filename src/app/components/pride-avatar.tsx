"use client";

import { useEffect, useState } from "react";

export function PrideAvatar({ children }: { children: React.ReactNode }) {
  const [isPrideTime, setIsPrideTime] = useState(false);

  useEffect(() => {
    const checkPrideTime = () => {
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const date = now.getDate();

      // Pride Month - entire June
      if (month === 6) {
        setIsPrideTime(true);
        return;
      }

      // Manchester Pride - week leading up to August bank holiday Monday (inclusive)
      if (month === 8) {
        const year = now.getFullYear();
        const lastDayOfMonth = new Date(year, 8, 0).getDate(); // Aug has 31 days; month index 8 means Sept 0th = last day of Aug
        const lastDayWeekday = new Date(year, 7, lastDayOfMonth).getDay(); // 0=Sun..1=Mon
        let lastMonday = lastDayOfMonth;
        if (lastDayWeekday !== 1) {
          lastMonday = lastDayOfMonth - ((lastDayWeekday + 6) % 7);
        }
        const prideWeekStart = Math.max(1, lastMonday - 7);
        const prideWeekEnd = lastMonday;
        if (date >= prideWeekStart && date <= prideWeekEnd) {
          setIsPrideTime(true);
          return;
        }
      }
      setIsPrideTime(false);
    };
    checkPrideTime();
    const id = setInterval(checkPrideTime, 24 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!isPrideTime) {
    return (
      <div style={{ border: '2px solid rgba(255,255,255,0.9)', borderRadius: '9999px', display: 'inline-block' }}>
        {children}
      </div>
    );
  }

  // Pride rainbow rings via box-shadow
  return (
    <div className="relative" style={{ display: 'inline-block' }}>
      <div
        style={{
          borderRadius: '9999px',
          boxShadow: `
            0 0 0 3px rgb(239 68 68),
            0 0 0 6px rgb(249 115 22),
            0 0 0 9px rgb(250 204 21),
            0 0 0 12px rgb(34 197 94),
            0 0 0 15px rgb(59 130 246),
            0 0 0 18px rgb(147 51 234)
          `,
        }}
      >
        {children}
      </div>
    </div>
  );
}

