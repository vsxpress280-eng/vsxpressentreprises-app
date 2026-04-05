import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const TransferChat = ({ transferId, status, readOnly = false }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Statuses that allow chatting
  // Including 'cancel_requested' as active for chatting purposes
  const isActive = ["en_attente", "pending", "en_cours", "in_progress", "cancel_requested"].includes(
    String(status || "").toLowerCase()
  );
  const canChat = isActive && !readOnly;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  };

  const fetchMessages = async () => {
    if (!transferId) return;

    const { data, error } = await supabase
      .from("transfer_messages")
      .select("*")
      .eq("transfer_id", transferId)
      .order("created_at", { ascending: true });

    if (!error) setMessages(data || []);
    scrollToBottom();
  };

  useEffect(() => {
    fetchMessages();

    if (!transferId) return;

    const channel = supabase
      .channel(`chat-${transferId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transfer_messages",
          filter: `transfer_id=eq.${transferId}`,
        },
        (payload) => {
          const incoming = payload?.new;
          if (!incoming?.id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const value = newMessage.trim();
    if (!value || !canChat || !transferId || !user?.id) return;

    setSending(true);

    const tempId = `temp_${Date.now()}`;
    // Use user.role if available, fallback to 'agent'
    // Ensure we handle worker/agent roles correctly for sender_role
    // In this context, we rely on user.role from AuthContext
    const userRole = user.role === 'worker' ? 'worker' : 'agent';

    const optimistic = {
      id: tempId,
      transfer_id: transferId,
      sender_id: user.id,
      sender_role: userRole,
      message: value,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from("transfer_messages")
        .insert({
          transfer_id: transferId,
          sender_id: user.id,
          sender_role: userRole,
          message: value,
        })
        .select("*")
        .single();

      if (error) throw error;

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (data?.id && withoutTemp.some((m) => m.id === data.id)) return withoutTemp;
        return [...withoutTemp, data].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      scrollToBottom();
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(value);
      console.error("Send error", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden mt-6">
      <div className="p-3 bg-[#111] border-b border-[#2A2A2A] flex justify-between items-center">
        <h3 className="font-semibold text-sm text-[#A0A0A0]">
          {t("chat.title") || "Discussion"}
        </h3>

        {!isActive && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {t("chat.closed") || "Fermé"}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center text-[#444] text-sm mt-10">
            {t("chat.noMessages") || "Aucun message"}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    isMe
                      ? "bg-[#D4AF37] text-black rounded-tr-none"
                      : "bg-[#2A2A2A] text-white rounded-tl-none"
                  )}
                >
                  {msg.message}
                </div>
                <span className="text-[10px] text-[#666] mt-1">
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {!readOnly && (
        <form
          onSubmit={handleSend}
          className="p-3 bg-[#111] border-t border-[#2A2A2A] flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              canChat
                ? t("chat.placeholder") || "Écrire un message..."
                : t("chat.conversationClosed") || "Conversation fermée"
            }
            disabled={!canChat || sending}
            className="bg-[#1E1E1E] border-[#2A2A2A] text-white focus-visible:ring-[#D4AF37]"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canChat || sending || !newMessage.trim()}
            className="bg-[#D4AF37] text-black hover:bg-[#B8941F]"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
};

export default TransferChat;