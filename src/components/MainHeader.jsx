import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Menu,
  LogOut,
  User,
  LayoutDashboard,
  X,
  Loader2,
  ChevronRight,
  History,
  Settings,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import AdjustmentBadge from "@/components/AdjustmentBadge";

const MainHeader = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthPage = useMemo(
    () =>
      ["/login", "/auth/reset-password", "/auth/set-security-question"].includes(
        location.pathname
      ),
    [location.pathname]
  );

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("nom, prenom, role, email")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        if (mounted) setProfile(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/login");
  }, [signOut, navigate]);

  const getDashboardRoute = (role) => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "agent":
        return "/agent/dashboard";
      case "worker":
        return "/worker/dashboard";
      case "special-agent":
        return "/special-agent/dashboard";
      default:
        return "/login";
    }
  };

  const role = profile?.role || null;
  const dashboardRoute = profile ? getDashboardRoute(profile.role) : "/login";
  const displayName = profile
    ? `${profile.prenom || ""} ${profile.nom || ""}`.trim() || profile.email
    : "User";

  // User Status Component
  const UserStatusDisplay = () => (
    <div className="flex items-center gap-2 ml-2 text-xs">
      <div className="flex flex-col text-right sm:border-l sm:border-white/10 sm:pl-4">
        <span className="block text-[10px] sm:text-xs text-[#888] whitespace-nowrap">
          {t("header.connectedAs", "Connecté en tant que")}
        </span>
        <span className="block font-bold text-[#D4AF37] text-xs sm:text-sm whitespace-nowrap">
          {displayName}
        </span>
      </div>
    </div>
  );

  const menuItems = useMemo(() => {
    const items = [];

    items.push({
      key: "dashboard",
      label: t("header.dashboard", "Tableau de bord"),
      icon: LayoutDashboard,
      to: dashboardRoute,
      color: "text-blue-500",
    });

    if (role === 'admin') {
      items.push({
        key: "adjustments",
        label: "Ajustements",
        icon: Scale,
        to: "/adjustment",
        color: "text-purple-500",
      });
    }

    if (role === 'agent' || role === 'worker' || role === 'special-agent') {
      items.push({
        key: "my-adjustments",
        label: "Mes Ajustements",
        icon: Scale,
        to: "/adjustment/my-adjustments",
        color: "text-purple-500",
        badge: <AdjustmentBadge />
      });
    }

    if (role === "agent") {
      items.push({
        key: "history",
        label: t("header.history", "Historique"),
        icon: History,
        to: "/agent/history",
        color: "text-green-500",
      });

      items.push({
        key: "settings",
        label: t("navigation.agent.settings", "Paramètres"),
        icon: Settings,
        to: "/agent/settings",
        color: "text-[#D4AF37]",
      });
    }

    if (role === "worker") {
      items.push({
        key: "profile",
        label: t("header.profile"),
        icon: User,
        to: "/profile",
        color: "text-[#D4AF37]",
      });

      items.push({
        key: "settings",
        label: t("navigation.worker.settings"),
        icon: Settings,
        to: "/worker/settings",
        color: "text-[#D4AF37]",
      });

      return items;
    }

    if (role && role !== "admin") {
      items.push({
        key: "profile",
        label: t("header.profile", "Profil"),
        icon: User,
        to: role === "agent" ? "/profile" : "/profile/change-password",
        color: "text-[#D4AF37]",
      });
    }

    return items;
  }, [t, dashboardRoute, role]);

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  if (isAuthPage) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[64px] bg-[#0A0A0A] border-b border-[#1F1F1F] shadow-sm shadow-[#D4AF37]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo Section */}
        <div
          onClick={() => navigate(dashboardRoute)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1A1A1A] border border-[#333] group-hover:border-[#D4AF37] transition-colors">
            <img
              src="https://horizons-cdn.hostinger.com/33b3eaaa-66f9-4e26-bd8b-9ffa2c491ada/0ccbbb834409cecfb75836c33dad2124.jpg"
              alt="VS XPRESS ENTREPRISES"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center leading-none">
            <div className="text-[#D4AF37] font-bold text-lg tracking-wide group-hover:text-white transition-colors">VS XPRESS</div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#A0A0A0] group-hover:text-white/80 transition-colors uppercase">ENTREPRISES</div>
          </div>
        </div>

        {/* Desktop Menu (Visible >= 768px) */}
        <div className="hidden md:flex items-center gap-4">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#888]" />
          ) : (
            <>
              {/* Notification Bell */}
              <div className="mr-2">
                <NotificationBell />
              </div>

              {/* User Status */}
              <UserStatusDisplay />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(dashboardRoute)}
                title={t("header.dashboard", "Tableau de bord")}
              >
                <LayoutDashboard size={16} />
              </Button>

              {role === 'admin' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/adjustment')}
                  title="Ajustements"
                  className="text-purple-400"
                >
                  <Scale size={16} />
                </Button>
              )}

              {(role === 'agent' || role === 'worker' || role === 'special-agent') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/adjustment/my-adjustments')}
                  title="Mes Ajustements"
                  className="text-purple-400 relative"
                >
                  <Scale size={16} />
                  <AdjustmentBadge />
                </Button>
              )}

              {role === "agent" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/agent/history")}
                    title={t("header.history", "Historique")}
                  >
                    <History size={16} />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/agent/settings")}
                    title={t("navigation.agent.settings", "Paramètres")}
                    className="text-[#D4AF37]"
                  >
                    <Settings size={16} />
                  </Button>
                </>
              )}

              {role === "worker" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/profile")}
                    title={t("header.profile")}
                  >
                    <User size={16} />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/worker/settings")}
                    title={t("navigation.worker.settings")}
                  >
                    <Settings size={16} />
                  </Button>
                </>
              )}

              {role !== "admin" && role !== "worker" && role !== "agent" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    navigate(
                      "/profile/change-password"
                    )
                  }
                  title={t("header.profile", "Profil")}
                >
                  <User size={16} />
                </Button>
              )}
              
              {role === "agent" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/profile")}
                  title={t("header.profile", "Profil")}
                >
                   <User size={16} />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-red-400"
                onClick={handleLogout}
                title={t("header.logout", "Déconnexion")}
              >
                <LogOut size={16} />
              </Button>
            </>
          )}
        </div>

        {/* Mobile/Tablet Menu (Visible < 768px) */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile Badge for Users */}
          {(role === 'agent' || role === 'worker' || role === 'special-agent') && (
            <div onClick={() => navigate('/adjustment/my-adjustments')} className="cursor-pointer">
              <AdjustmentBadge />
            </div>
          )}

          {/* User Status */}
          {!loading && <UserStatusDisplay />}
          
          <button
            className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#D4AF37]"
            onClick={() => setIsOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-[60] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                initial={{ x: 360 }}
                animate={{ x: 0 }}
                exit={{ x: 360 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className="absolute right-0 top-0 h-full w-[82%] max-w-[380px] bg-[#0B0B0B] border-l border-white/10"
              >
                <div className="p-4 border-b border-white/10 flex justify-between">
                  <div>
                    <p className="text-xs text-[#888]">
                      {t("header.connectedAs", "Connecté en tant que")}
                    </p>
                    <p className="font-semibold text-white">{displayName}</p>
                    {role && (
                      <span className="mt-2 inline-flex rounded-full bg-[#D4AF37]/10 px-2 py-1 text-[11px] text-[#D4AF37] uppercase">
                        {role}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 pb-28 overflow-y-auto h-full">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">
                    {t("common.navigation", "Navigation")}
                  </p>

                  <div className="space-y-2">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.to);

                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            navigate(item.to);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                            active
                              ? "bg-white/10 border-white/10"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full flex items-center justify-center bg-black/30 border border-white/10">
                              <Icon size={18} className={item.color} />
                            </span>
                            <span className="text-sm text-[#EAEAEA]">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.badge}
                            <ChevronRight size={16} className="text-white/40" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/20">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 py-3"
                  >
                    <LogOut size={16} />
                    {t("header.logout", "Déconnexion")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default React.memo(MainHeader);