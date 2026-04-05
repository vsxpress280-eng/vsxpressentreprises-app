// src/hooks/useWorkerNotifications.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export const useWorkerNotifications = () => {
  const { user } = useAuth();

  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [pendingRegulations, setPendingRegulations] = useState(0);
  const [loading, setLoading] = useState(true);

  // évite setState après unmount (safe)
  const mountedRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      if (mountedRef.current) setLoading(true);

      // 1) Transfers "en attente"
      const { count: transfersCount, error: transfersError } = await supabase
        .from("transfers")
        .select("*", { count: "exact", head: true })
        .eq("worker_id", user.id)
        .in("status", ["pending", "en_attente", "waiting", "processing"]);

      if (!transfersError) {
        if (mountedRef.current) setPendingTransfers(transfersCount || 0);
      } else if (transfersError.code !== "PGRST116") {
        console.error("Error fetching transfers count:", transfersError);
      }

      // 2) Régularisations (worker_adjustments)
      // 🎯 On veut uniquement celles qui nécessitent encore une action du worker
      const pendingStates = ["pending", "proposed", "proposé", "en_attente", "waiting"];

      // États "décidés" possibles (ajuste si tu utilises d'autres mots)
      const decidedStates = [
        "accepté",
        "refusé",
        "accepted",
        "refused",
        "rejected",
        "completed",
        "done",
        "terminé",
        "termine",
      ];

      const pendingCSV = pendingStates.join(",");
      const decidedCSV = decidedStates.join(",");

      /**
       * ✅ LOGIQUE :
       * - decided_at IS NULL  (si tu le remplis quand accepté/refusé)
       * - EXCLURE toute ligne où statut OU status est "accepté/refusé/..."
       * - Compter:
       *    A) statut IN pending
       *    OU
       *    B) statut IS NULL ET status IN pending
       *
       * Ça évite le cas: statut="accepté" mais status="proposé" (ne sera plus compté)
       */
      const { count: adjCount, error: adjError } = await supabase
        .from("worker_adjustments")
        .select("*", { count: "exact", head: true })
        .eq("worker_id", user.id)
        .is("decided_at", null)
        .not("statut", "in", `(${decidedCSV})`)
        .not("status", "in", `(${decidedCSV})`)
        .or(`statut.in.(${pendingCSV}),and(statut.is.null,status.in.(${pendingCSV}))`);

      if (!adjError) {
        if (mountedRef.current) setPendingRegulations(adjCount || 0);
      } else if (adjError.code !== "PGRST116") {
        console.error("Error fetching adjustments count:", adjError);
      }
    } catch (err) {
      console.error("Unexpected error in notification hook:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchCounts();

    if (!user?.id) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    const transfersChannel = supabase
      .channel(`worker-notif-transfers-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transfers",
          filter: `worker_id=eq.${user.id}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    const adjustmentsChannel = supabase
      .channel(`worker-notif-adjustments-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_adjustments",
          filter: `worker_id=eq.${user.id}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(transfersChannel);
      supabase.removeChannel(adjustmentsChannel);
    };
  }, [user?.id, fetchCounts]);

  return {
    pendingTransfers,
    pendingRegulations,
    totalNotifications: pendingTransfers + pendingRegulations,
    loading,
    refresh: fetchCounts,
  };
};