"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Job } from "@/lib/types";

// Session-scoped UI state that must survive tab unmounts. Tab panels mount and
// unmount as the user switches dashboard tabs, so anything held in a panel's
// own useState is lost on switch. This provider lives in DashboardClient,
// above the tabs, so its state persists for the lifetime of the dashboard.

// The Jobs-tab search form values + last results. Mirrors the fields the
// search form binds to and the Job[] shape searchJobs returns.
export interface JobsSearchState {
  query: string;
  setQuery: (v: string) => void;
  where: string;
  setWhere: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  fullTime: boolean;
  setFullTime: (v: boolean) => void;
  // null = no search run yet; [] = searched, no results.
  results: Job[] | null;
  setResults: (v: Job[] | null) => void;
}

export interface DashboardUIState {
  jobsSearch: JobsSearchState;
  // True while the Profile editor holds unsaved edits. DashboardClient reads
  // this to guard tab switches away from the Profile tab.
  profileDirty: boolean;
  setProfileDirty: (v: boolean) => void;
}

const DashboardUIContext = createContext<DashboardUIState | null>(null);

export function DashboardUIProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [where, setWhere] = useState("");
  const [country, setCountry] = useState("us");
  const [fullTime, setFullTime] = useState(false);
  const [results, setResults] = useState<Job[] | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);

  const value = useMemo<DashboardUIState>(
    () => ({
      jobsSearch: {
        query,
        setQuery,
        where,
        setWhere,
        country,
        setCountry,
        fullTime,
        setFullTime,
        results,
        setResults,
      },
      profileDirty,
      setProfileDirty,
    }),
    [query, where, country, fullTime, results, profileDirty]
  );

  return (
    <DashboardUIContext.Provider value={value}>
      {children}
    </DashboardUIContext.Provider>
  );
}

export function useDashboardUI(): DashboardUIState {
  const ctx = useContext(DashboardUIContext);
  if (!ctx) {
    throw new Error("useDashboardUI must be used within a DashboardUIProvider");
  }
  return ctx;
}
