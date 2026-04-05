import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

// ✅ valeurs "pending" (on normalise donc peu importe majuscule/accents/espaces/_)
const PENDING_KEYS = {
  transfers: [
    "pending",
    "enattente",
    "waiting",
    "processing",
    "inprogress",
    "assigned",
    "cancelrequested",
    "proposed",
    "propose",
  ],
  deposits: ["pending", "enattente"],
  adjustments: ["pending", "proposed", "propose"],
};

const normalize = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "")
    .replace(/[^\w]+/g, "");
};

const getStatusValue = (row) => row?.status ?? row?.statut ?? "";

const computePendingCount = (rows, type) => {
  const keys = PENDING_KEYS[type] || [];
  let c = 0;
  for (const r of rows || []) {
    const st = normalize(getStatusValue(r));
    if (keys.some((k) => st.includes(k))) c += 1;
  }
  return c;
};

// ✅ Fetch robuste: tente order(created_at) sinon retry sans order
const safeFetchRows = async ({ table, selectCols, filterCol, filterVal }) => {
  let q = supabase.from(table).select(selectCols).limit(1000);

  if (filterCol && filterVal) q = q.eq(filterCol, filterVal);

  // try with order
  {
    const { data, error } = await q.order("created_at", { ascending: false });
    if (!error) return Array.isArray(data) ? data : [];
  }

  // retry without order
  {
    const { data, error } = await q;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }
};

export const useKpiNotifications = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [counts, setCounts] = useState({
    adminPendingDepositsCount: 0,
    adminPendingTransfersCount: 0,
    adminPendingAdjustmentsCount: 0,

    agentPendingDepositsCount: 0,
    agentPendingTransfersCount: 0,

    workerPendingTransfersCount: 0,
    workerPendingAdjustmentsCount: 0,

    loading: true,
  });

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ✅ garantit un role même si user.role est vide
  const ensureRole = useCallback(async (u) => {
    if (!u?.id) return null;
    if (u.role) return u.role;
    const { data, error } = await supabase.from("users").select("role").eq("id", u.id).single();
    if (error) return null;
    return data?.role ?? null;
  }, []);

  const fetchCounts = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser?.id) return;

    const role = await ensureRole(currentUser);

    const updates = { loading: false };

    try {
      // ---------------- ADMIN ----------------
      if (role === "admin") {
        // deposits => colonne statut
        const dep = await safeFetchRows({
          table: "deposits",
          selectCols: "id, statut, created_at",
        });
        updates.adminPendingDepositsCount = computePendingCount(dep, "deposits");

        // transfers => colonne status
        const tr = await safeFetchRows({
          table: "transfers",
          selectCols: "id, status, created_at",
        });
        updates.adminPendingTransfersCount = computePendingCount(tr, "transfers");

        // worker_adjustments => colonne statut
        const adj = await safeFetchRows({
          table: "worker_adjustments",
          selectCols: "id, statut, created_at",
        });
        updates.adminPendingAdjustmentsCount = computePendingCount(adj, "adjustments");
      }

      // ---------------- AGENT ----------------
      if (role === "agent") {
        const dep = await safeFetchRows({
          table: "deposits",
          selectCols: "id, statut, created_at, agent_id",
          filterCol: "agent_id",
          filterVal: currentUser.id,
        });
        updates.agentPendingDepositsCount = computePendingCount(dep, "deposits");

        const tr = await safeFetchRows({
          table: "transfers",
          selectCols: "id, status, created_at, agent_id",
          filterCol: "agent_id",
          filterVal: currentUser.id,
        });
        updates.agentPendingTransfersCount = computePendingCount(tr, "transfers");
      }

      // ---------------- WORKER ----------------
      if (role === "worker") {
        const tr = await safeFetchRows({
          table: "transfers",
          selectCols: "id, status, created_at, worker_id",
          filterCol: "worker_id",
          filterVal: currentUser.id,
        });
        updates.workerPendingTransfersCount = computePendingCount(tr, "transfers");

        const adj = await safeFetchRows({
          table: "worker_adjustments",
          selectCols: "id, statut, created_at, worker_id",
          filterCol: "worker_id",
          filterVal: currentUser.id,
        });
        updates.workerPendingAdjustmentsCount = computePendingCount(adj, "adjustments");
      }

      setCounts((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error("[KPI] fetchCounts error:", error);
      setCounts((prev) => ({ ...prev, loading: false }));
    }
  }, [ensureRole]);

  useEffect(() => {
    if (!user?.id) return;

    fetchCounts();

    const refresh = () => fetchCounts();
    const channels = [];

    // ✅ subscriptions (on ne change pas tes filters)
    if (user.role === "admin") {
      channels.push(
        supabase.channel("admin-kpi-deposits").on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, refresh).subscribe()
      );
      channels.push(
        supabase.channel("admin-kpi-transfers").on("postgres_changes", { event: "*", schema: "public", table: "transfers" }, refresh).subscribe()
      );
      channels.push(
        supabase
          .channel("admin-kpi-adjustments")
          .on("postgres_changes", { event: "*", schema: "public", table: "worker_adjustments" }, refresh)
          .subscribe()
      );
    }

    if (user.role === "agent") {
      channels.push(
        supabase
          .channel(`agent-kpi-deposits-${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `agent_id=eq.${user.id}` }, refresh)
          .subscribe()
      );
      channels.push(
        supabase
          .channel(`agent-kpi-transfers-${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "transfers", filter: `agent_id=eq.${user.id}` }, refresh)
          .subscribe()
      );
    }

    if (user.role === "worker") {
      channels.push(
        supabase
          .channel(`worker-kpi-transfers-${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "transfers", filter: `worker_id=eq.${user.id}` }, refresh)
          .subscribe()
      );
      channels.push(
        supabase
          .channel(`worker-kpi-adjustments-${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "worker_adjustments", filter: `worker_id=eq.${user.id}` }, refresh)
          .subscribe()
      );
    }

    return () => channels.forEach((ch) => supabase.removeChannel(ch));
  }, [user?.id, user?.role, fetchCounts]);

  const notifications = useMemo(() => {
    if (!user) return [];
    const now = new Date().toISOString();
    const list = [];

    if (user.role === "worker") {
      if (counts.workerPendingTransfersCount > 0) {
        list.push({
          id: "worker-trans",
          type: "transfer",
          count: counts.workerPendingTransfersCount,
          label: t("notifications.transfers", { count: counts.workerPendingTransfersCount }),
          route: "/worker/transfers",
          created_at: now,
        });
      }
      if (counts.workerPendingAdjustmentsCount > 0) {
        list.push({
          id: "worker-adj",
          type: "adjustment",
          count: counts.workerPendingAdjustmentsCount,
          label: t("notifications.adjustments", { count: counts.workerPendingAdjustmentsCount }),
          route: "/worker/adjustments",
          created_at: now,
        });
      }
    }

    return list;
  }, [user, counts, t]);

  const totalUnreadCount = useMemo(() => notifications.reduce((acc, n) => acc + (Number(n.count) || 0), 0), [notifications]);

  return { ...counts, notifications, totalUnreadCount };
};