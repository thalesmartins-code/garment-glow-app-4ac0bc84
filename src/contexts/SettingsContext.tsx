import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  MonthlyTarget,
  DailyPMT,
  generateTargetId,
  generateDefaultPMTDistribution,
} from "@/types/settings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsContextType {
  targets: MonthlyTarget[];
  getTarget: (sellerId: string, marketplaceId: string, year: number, month: number) => MonthlyTarget | undefined;
  saveTarget: (target: MonthlyTarget) => Promise<void>;
  deleteTarget: (id: string) => Promise<void>;
  updatePMTDistribution: (targetId: string, distribution: DailyPMT[]) => void;
  updateTargetValue: (targetId: string, value: number) => void;
  loadingTargets: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = "marketplace-settings-targets";

// ── DB row ↔ MonthlyTarget mappers ───────────────────────────────────────────

function rowToTarget(row: any): MonthlyTarget {
  return {
    id: row.target_id,
    sellerId: row.seller_id,
    marketplaceId: row.marketplace_id,
    year: row.year,
    month: row.month,
    targetValue: Number(row.target_value ?? 0),
    kpiTargets: row.kpi_targets ?? undefined,
    pmtDistribution: row.pmt_distribution ?? [],
  };
}

function targetToRow(userId: string, target: MonthlyTarget) {
  return {
    user_id: userId,
    target_id: target.id,
    seller_id: target.sellerId,
    marketplace_id: target.marketplaceId,
    year: target.year,
    month: target.month,
    target_value: target.targetValue,
    kpi_targets: target.kpiTargets ?? null,
    pmt_distribution: target.pmtDistribution,
    updated_at: new Date().toISOString(),
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [targets, setTargets] = useState<MonthlyTarget[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [loadingTargets, setLoadingTargets] = useState(false);

  // ── Load from Supabase on login ───────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    setLoadingTargets(true);
    supabase
      .from("ml_targets")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error("SettingsContext: failed to load targets from Supabase", error.message);
          return;
        }
        if (data && data.length > 0) {
          const remote = data.map(rowToTarget);
          setTargets(remote);
          // Sync local cache
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch {}
        }
      })
      .finally(() => setLoadingTargets(false));
  }, [user]);

  // ── Persist to localStorage whenever targets change ───────────────────────

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(targets)); } catch {}
  }, [targets]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getTarget = useCallback(
    (sellerId: string, marketplaceId: string, year: number, month: number): MonthlyTarget | undefined => {
      const id = generateTargetId(sellerId, marketplaceId, year, month);
      return targets.find((t) => t.id === id);
    },
    [targets]
  );

  const saveTarget = useCallback(async (target: MonthlyTarget) => {
    // 1. Update local state immediately (optimistic)
    setTargets((prev) => {
      const idx = prev.findIndex((t) => t.id === target.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = target;
        return updated;
      }
      return [...prev, target];
    });

    // 2. Persist to Supabase
    if (!user) return;
    const row = targetToRow(user.id, target);
    const { error } = await supabase
      .from("ml_targets")
      .upsert(row, { onConflict: "user_id,seller_id,marketplace_id,year,month" });

    if (error) {
      console.error("SettingsContext: failed to save target to Supabase", error.message);
    }
  }, [user]);

  const deleteTarget = useCallback(async (id: string) => {
    // 1. Update local state
    setTargets((prev) => prev.filter((t) => t.id !== id));

    // 2. Delete from Supabase
    if (!user) return;
    const { error } = await supabase
      .from("ml_targets")
      .delete()
      .eq("user_id", user.id)
      .eq("target_id", id);

    if (error) {
      console.error("SettingsContext: failed to delete target from Supabase", error.message);
    }
  }, [user]);

  const updatePMTDistribution = useCallback((targetId: string, distribution: DailyPMT[]) => {
    setTargets((prev) =>
      prev.map((t) => t.id === targetId ? { ...t, pmtDistribution: distribution } : t)
    );
    // Persist the updated target
    setTargets((prev) => {
      const target = prev.find((t) => t.id === targetId);
      if (target && user) {
        const row = targetToRow(user.id, { ...target, pmtDistribution: distribution });
        supabase.from("ml_targets")
          .upsert(row, { onConflict: "user_id,seller_id,marketplace_id,year,month" })
          .then(({ error }) => {
            if (error) console.error("updatePMTDistribution supabase error:", error.message);
          });
      }
      return prev;
    });
  }, [user]);

  const updateTargetValue = useCallback((targetId: string, value: number) => {
    setTargets((prev) =>
      prev.map((t) => t.id === targetId ? { ...t, targetValue: value } : t)
    );
    setTargets((prev) => {
      const target = prev.find((t) => t.id === targetId);
      if (target && user) {
        const row = targetToRow(user.id, { ...target, targetValue: value });
        supabase.from("ml_targets")
          .upsert(row, { onConflict: "user_id,seller_id,marketplace_id,year,month" })
          .then(({ error }) => {
            if (error) console.error("updateTargetValue supabase error:", error.message);
          });
      }
      return prev;
    });
  }, [user]);

  return (
    <SettingsContext.Provider
      value={{
        targets,
        getTarget,
        saveTarget,
        deleteTarget,
        updatePMTDistribution,
        updateTargetValue,
        loadingTargets,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Helper hook to get or create a target for specific parameters
export function useTargetConfig(
  sellerId: string,
  marketplaceId: string,
  year: number,
  month: number
) {
  const { getTarget, saveTarget } = useSettings();

  const target = getTarget(sellerId, marketplaceId, year, month);

  const getOrCreateTarget = useCallback((): MonthlyTarget => {
    if (target) return target;
    return {
      id: generateTargetId(sellerId, marketplaceId, year, month),
      sellerId,
      marketplaceId,
      year,
      month,
      targetValue: 0,
      pmtDistribution: generateDefaultPMTDistribution(year, month),
    };
  }, [target, sellerId, marketplaceId, year, month]);

  return { target, getOrCreateTarget, saveTarget };
}
