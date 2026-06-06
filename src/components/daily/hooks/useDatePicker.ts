"use client";

import { useCallback, useEffect, useState } from "react";
import { getCompletedDates } from "@/lib/result";
import type { AvailableDatesResp } from "../types";

export type UseDatePickerReturn = {
  today: string;
  playingDate: string;
  setPlayingDate: (date: string) => void;
  setToday: (date: string) => void;
  availableDates: Set<string>;
  completedDates: Set<string>;
  refreshCompletedDates: () => void;
  datePickerOpen: boolean;
  openDatePicker: () => void;
  closeDatePicker: () => void;
  handleDateSelect: (date: string) => void;
  datesLoading: boolean;
  isPlayingToday: boolean;
  isArchive: boolean;
};

export function useDatePicker(): UseDatePickerReturn {
  const [today, setToday] = useState<string>("");
  const [playingDate, setPlayingDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datesLoading, setDatesLoading] = useState(false);
  const [datesLoaded, setDatesLoaded] = useState(false);

  const isPlayingToday = playingDate === today;
  const isArchive = !isPlayingToday && !!playingDate;

  // Load completed dates from local storage on mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setCompletedDates(getCompletedDates());
    });
    return () => { cancelled = true; };
  }, []);

  const refreshCompletedDates = useCallback(() => {
    setCompletedDates(getCompletedDates());
  }, []);

  const closeDatePicker = useCallback(() => {
    setDatePickerOpen(false);
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    setPlayingDate(date);
    setDatePickerOpen(false);
  }, []);

  const openDatePicker = useCallback(() => {
    // Refresh completed dates before opening
    setCompletedDates(getCompletedDates());
    setDatePickerOpen(true);
    
    // Lazy load available dates on first open
    if (!datesLoaded && !datesLoading) {
      setDatesLoading(true);
      fetch("/api/daily/dates")
        .then((r) => r.json())
        .then((data: AvailableDatesResp) => {
          setAvailableDates(new Set(data.dates));
          // Update today if we have it from this response
          if (data.today && !today) {
            setToday(data.today);
          }
          setDatesLoaded(true);
        })
        .catch(() => {
          // Failed to load, user can still select today
        })
        .finally(() => {
          setDatesLoading(false);
        });
    }
  }, [datesLoaded, datesLoading, today]);

  return {
    today,
    playingDate,
    setPlayingDate,
    setToday,
    availableDates,
    completedDates,
    refreshCompletedDates,
    datePickerOpen,
    openDatePicker,
    closeDatePicker,
    handleDateSelect,
    datesLoading,
    isPlayingToday,
    isArchive,
  };
}
