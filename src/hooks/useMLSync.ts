import { useState, useCallback, useRef } from "react";
import { format, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useToast } from "@/hooks/use-toast";
import { getComparisonRanges, todayUTC } from "./useMLFilters";
import type { DateRange } from "./useMLFilters";
import type { MLUser } from "@/types/mlCache";

const LAST_ML_SYNC_KEY = "ml_last_synced_at";
const LAST_ML_SYNC_TS_KEY = "ml_last_synced_ts";
export const AUTO_SYNC_STALE_MS = 10 * 60 * 1000;
const SYNC_CHUNK_DAYS = 1;
const SYNC_COOLDOWN_MS = 30_000; // 30s min between syncs

interface UseMLSyncOptions {
  customRange: DateRange;
  period: number;
  loadFromCache: (from?: string, to?: string) => Promise<boolean>;
  loadHourlyCache: (date?: string | null) => Promise<any>;
  loadProductCache: (from: string, to: string) => Promise<void>;
  setMlUser: (u: MLUser | null) => void;
  setSellerReputation: (r: any) => void;
}

export function useMLSync(opts: UseMLSyncOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { stores, selectedStore, resolvedMLUserIds } = useMLStore();

  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    () => localStorage.getItem(LAST_ML_SYNC_KEY)
  );
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const autoSyncTriggeredRef = useRef(false);
  const lastSyncStartRef = useRef(0);

  const syncFromAPI = useCallback(
    async (syncOpts?: { from?: Date; to?: Date; periodDays?: number }) => {
      if (!user) return;
      const now = Date.now();
      if (now - lastSyncStartRef.current < SYNC_COOLDOWN_MS) {
        toast({ title: "Aguarde", description: "Sincronização em andamento, tente novamente em alguns segundos." });
        return;
      }
      lastSyncStartRef.current = now;
      setSyncing(true);

      try {
        if (resolvedMLUserIds.length === 0) return;

        const today = startOfDay(new Date());
        let rangeStart = new Date(today);
        let rangeEnd = new Date(today);

        const effectiveFrom = syncOpts?.from ?? opts.customRange?.from;
        const effectiveTo = syncOpts?.to ?? opts.customRange?.to ?? opts.customRange?.from;

        if (effectiveFrom) {
          rangeStart = startOfDay(effectiveFrom);
          rangeEnd = startOfDay(effectiveTo ?? effectiveFrom);
        } else {
          const days = syncOpts?.periodDays ?? (opts.period > 0 ? opts.period : 1);
          rangeStart = new Date(today);
          rangeStart.setDate(today.getDate() - days);
        }

        const fromDateStr = format(rangeStart, "yyyy-MM-dd");
        const toDateStr = format(rangeEnd, "yyyy-MM-dd");
        const { fetchFrom, fetchTo, currentFrom, currentTo } = getComparisonRanges(
          effectiveFrom ? { from: effectiveFrom, to: effectiveTo ?? effectiveFrom } : null,
          effectiveFrom ? 0 : (syncOpts?.periodDays ?? opts.period),
        );

        const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalChunks = Math.ceil(totalDays / SYNC_CHUNK_DAYS) * resolvedMLUserIds.length;
        let chunksDone = 0;
        setSyncProgress({ current: 0, total: totalChunks });

        let lastUserInfo: MLUser | null = null;
        for (const mlUserId of resolvedMLUserIds) {
          let cursor = new Date(rangeStart);
          while (cursor <= rangeEnd) {
            const chunkStart = new Date(cursor);
            const chunkEnd = new Date(cursor);
            chunkEnd.setDate(chunkEnd.getDate() + (SYNC_CHUNK_DAYS - 1));
            if (chunkEnd > rangeEnd) chunkEnd.setTime(rangeEnd.getTime());

            const { data: syncData, error: syncError } = await supabase.functions.invoke(
              "mercado-libre-integration",
              {
                body: {
                  ml_user_id: mlUserId,
                  date_from: format(chunkStart, "yyyy-MM-dd"),
                  date_to: format(chunkEnd, "yyyy-MM-dd"),
                  seller_id: stores.find(s => s.ml_user_id === mlUserId)?.seller_id || null,
                },
              },
            );

            if (syncError) throw syncError;
            if (!syncData?.success) throw new Error(syncData?.error || "Sync failed");
            if (syncData.user) lastUserInfo = syncData.user;
            if (syncData.seller_reputation) opts.setSellerReputation(syncData.seller_reputation);

            chunksDone++;
            setSyncProgress({ current: chunksDone, total: totalChunks });
            cursor.setDate(cursor.getDate() + SYNC_CHUNK_DAYS);
          }
        }

        let hourlyDateOverride: string | null;
        if (effectiveFrom) {
          hourlyDateOverride = fromDateStr === toDateStr ? fromDateStr : null;
        } else {
          const days = syncOpts?.periodDays ?? (opts.period > 0 ? opts.period : 1);
          hourlyDateOverride = days <= 1 ? todayUTC() : null;
        }

        await Promise.all([
          opts.loadFromCache(fetchFrom, fetchTo),
          opts.loadHourlyCache(hourlyDateOverride),
          opts.loadProductCache(currentFrom, currentTo),
        ]);
        if (lastUserInfo) opts.setMlUser(lastUserInfo);

        const nowIso = new Date().toISOString();
        setLastSyncedAt(nowIso);
        localStorage.setItem(LAST_ML_SYNC_KEY, nowIso);
        localStorage.setItem(LAST_ML_SYNC_TS_KEY, String(Date.now()));

        // Log sync
        const daysCount = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        for (const mlUserId of resolvedMLUserIds) {
          await supabase.from("ml_sync_log").upsert(
            {
              user_id: user.id,
              ml_user_id: mlUserId,
              date_from: fromDateStr,
              date_to: toDateStr,
              days_synced: daysCount,
              source: "auto",
              synced_at: nowIso,
            },
            { onConflict: "user_id,ml_user_id,date_from,date_to,source" },
          );
        }

        toast({ title: "Sincronizado", description: `Dados atualizados: ${fromDateStr} → ${toDateStr}.` });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      } finally {
        setSyncing(false);
        setSyncProgress(null);
      }
    },
    [user, toast, opts, stores, resolvedMLUserIds],
  );

  const shouldAutoSync = useCallback(() => {
    if (autoSyncTriggeredRef.current) return false;
    autoSyncTriggeredRef.current = true;
    const lastTs = Number(localStorage.getItem(LAST_ML_SYNC_TS_KEY) ?? 0);
    return Date.now() - lastTs > AUTO_SYNC_STALE_MS;
  }, []);

  const resetSync = useCallback(() => {
    autoSyncTriggeredRef.current = false;
    setLastSyncedAt(null);
  }, []);

  return {
    syncing,
    lastSyncedAt,
    setLastSyncedAt,
    syncProgress,
    syncFromAPI,
    shouldAutoSync,
    resetSync,
  };
}
