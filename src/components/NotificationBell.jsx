import React, { useState, useRef, useEffect } from "react";
import { Bell, CreditCard, ArrowRightLeft, FileText, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useKpiNotifications } from "@/hooks/useKpiNotifications";
import { Button } from "@/components/ui/button";

const NotificationBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, totalUnreadCount } = useKpiNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case "deposit":
        return <CreditCard className="w-5 h-5 text-[#10B981]" />;
      case "transfer":
        return <ArrowRightLeft className="w-5 h-5 text-[#3B82F6]" />;
      case "adjustment":
        return <FileText className="w-5 h-5 text-[#8B5CF6]" />;
      default:
        return <CheckCircle className="w-5 h-5 text-[#A0A0A0]" />;
    }
  };

  const handleItemClick = (route) => {
    setIsOpen(false);
    navigate(route);
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-[#A0A0A0] hover:text-[#D4AF37] hover:bg-[#1A1A1A] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {totalUnreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0B0B0B]">
            {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-[#2A2A2A] bg-[#141414]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  {t("notifications.title", "Notifications")}
                </h3>
                {totalUnreadCount > 0 && (
                  <span className="bg-[#D4AF37] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {totalUnreadCount === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <Bell className="w-6 h-6 text-[#444]" />
                  </div>
                  <p className="text-[#666] text-sm">
                    {t("notifications.empty", "No new notifications")}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.route)}
                      className="w-full text-left px-4 py-3 hover:bg-[#1A1A1A] transition-colors flex items-start gap-3 border-b border-[#1A1A1A] last:border-0"
                    >
                      <div className="mt-1 p-2 rounded-lg bg-[#141414] border border-[#2A2A2A]">
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white line-clamp-2">
                          {item.label}
                        </p>
                        <p className="text-xs text-[#666] mt-1">
                          {t("common.action", "Action required")}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-red-600/10 text-red-500 text-xs font-bold border border-red-600/20">
                        {item.count}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;