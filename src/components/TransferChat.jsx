import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Lock, Paperclip, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const TransferChat = ({ transferId, status, readOnly = false }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  // Define active statuses consistently across the app
  const activeStatuses = [
    "pending", "en_attente",
    "processing", "en_cours", "in_progress",
    "cancel_requested"
  ];

  const currentStatus = String(status || "").toLowerCase();
  const isActive = activeStatuses.includes(currentStatus);
  const canChat = isActive && !readOnly;

  const scrollToBottom = () => {
    if (bottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
  };

  const fetchMessages = async () => {
    if (!transferId) return;

    try {
      const { data, error } = await supabase
        .from("transfer_messages")
        .select("*")
        .eq("transfer_id", transferId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching messages:", error);
    }
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
  }, [transferId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const uploadToStorage = async (fileOrBlob, folder, contentType) => {
    if (!transferId || !user?.id) throw new Error("Missing transferId/user");

    const bucket = "chat-files";
    const ext =
      (fileOrBlob?.name && fileOrBlob.name.split(".").pop()) ||
      (contentType?.includes("png") && "png") ||
      (contentType?.includes("jpeg") && "jpg") ||
      (contentType?.includes("webm") && "webm") ||
      (contentType?.includes("ogg") && "ogg") ||
      (contentType?.includes("mp3") && "mp3") ||
      "bin";

    const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
    const path = `transfers/${transferId}/${folder}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, fileOrBlob, {
        contentType: contentType || fileOrBlob?.type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;

    if (!publicUrl) throw new Error("No public URL from storage");
    return publicUrl;
  };

  const sendMessageRecord = async (messageValue, tempId) => {
    const userRole = user.user_metadata?.role || user.role || "user";

    const { data, error } = await supabase
      .from("transfer_messages")
      .insert({
        transfer_id: transferId,
        sender_id: user.id,
        sender_role: userRole,
        message: messageValue,
      })
      .select("*")
      .single();

    if (error) throw error;

    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (data?.id && withoutTemp.some((m) => m.id === data.id)) return withoutTemp;
      const newList = [...withoutTemp, data];
      return newList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });
    scrollToBottom();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const value = newMessage.trim();
    if (!value || !canChat || !transferId || !user?.id) return;

    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const userRole = user.user_metadata?.role || user.role || 'user';

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
        const newList = [...withoutTemp, data];
        return newList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
      scrollToBottom();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Send error", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(value);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = () => {
    if (!canChat || sending) return;
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canChat || !transferId || !user?.id) return;
    if (!file.type?.startsWith("image/")) return;

    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const userRole = user.user_metadata?.role || user.role || "user";

    const optimistic = {
      id: tempId,
      transfer_id: transferId,
      sender_id: user.id,
      sender_role: userRole,
      message: "__IMAGE__:uploading",
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const url = await uploadToStorage(file, "images", file.type);
      const payload = `__IMAGE__:${url}`;
      await sendMessageRecord(payload, tempId);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Image send error", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!canChat || sending || recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];

      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" :
        "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        try {
          const chunks = recordedChunksRef.current || [];
          const type = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunks, { type });

          // Stop tracks to release mic
          stream.getTracks().forEach((t) => t.stop());

          if (blob.size < 500) return; // too small / cancelled

          setSending(true);

          const tempId = `temp_${Date.now()}`;
          const userRole = user.user_metadata?.role || user.role || "user";

          const optimistic = {
            id: tempId,
            transfer_id: transferId,
            sender_id: user.id,
            sender_role: userRole,
            message: "__AUDIO__:uploading",
            created_at: new Date().toISOString(),
            _optimistic: true,
          };

          setMessages((prev) => [...prev, optimistic]);
          scrollToBottom();

          const url = await uploadToStorage(blob, "audio", type);
          const payload = `__AUDIO__:${url}`;
          await sendMessageRecord(payload, tempId);
        } catch (error) {
          if (import.meta.env.DEV) console.error("Audio send error", error);
        } finally {
          setSending(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Mic error", error);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    } catch (e) {
      // ignore
    } finally {
      setRecording(false);
    }
  };

  const renderMessageBody = (msg) => {
    const raw = String(msg.message || "");
    if (raw.startsWith("__IMAGE__:")) {
      const url = raw.replace("__IMAGE__:", "").trim();
      if (!url || url === "uploading") {
        return (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Upload...
          </span>
        );
      }
      return (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt="image"
            className="max-w-full rounded-md border border-black/10"
            loading="lazy"
          />
        </a>
      );
    }

    if (raw.startsWith("__AUDIO__:")) {
      const url = raw.replace("__AUDIO__:", "").trim();
      if (!url || url === "uploading") {
        return (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Upload...
          </span>
        );
      }
      return (
        <audio controls className="w-[260px] max-w-full">
          <source src={url} />
          Your browser does not support audio.
        </audio>
      );
    }

    return raw;
  };

  return (
    <div className="flex flex-col h-[400px] bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden mt-6">
      <div className="p-3 bg-[#111] border-b border-[#2A2A2A] flex justify-between items-center">
        <h3 className="font-semibold text-sm text-[#A0A0A0]">
          {t("chat.title")}
        </h3>

        {!canChat && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {t("chat.closed")}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center text-[#444] text-sm mt-10">
            {t("chat.noMessages")}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const isSystem = msg.sender_role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-[10px] bg-[#333] text-[#AAA] px-2 py-1 rounded-full border border-[#444]">
                    {msg.message}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words",
                    isMe
                      ? "bg-[#D4AF37] text-black rounded-tr-none"
                      : "bg-[#2A2A2A] text-white rounded-tl-none"
                  )}
                >
                  {renderMessageBody(msg)}
                </div>
                <span className="text-[10px] text-[#666] mt-1">
                  {msg.sender_role !== 'user' && !isMe && (
                    <span className="uppercase font-bold mr-1">{msg.sender_role} • </span>
                  )}
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

      <form
        onSubmit={handleSend}
        className="p-3 bg-[#111] border-t border-[#2A2A2A] flex gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />

        <Button
          type="button"
          size="icon"
          onClick={handlePickImage}
          disabled={!canChat || sending}
          className="bg-[#1E1E1E] border border-[#2A2A2A] text-white hover:bg-[#222]"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          onClick={recording ? stopRecording : startRecording}
          disabled={!canChat || sending}
          className={cn(
            "border border-[#2A2A2A] text-white hover:bg-[#222]",
            recording ? "bg-red-600 hover:bg-red-700" : "bg-[#1E1E1E]"
          )}
        >
          {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            canChat
              ? t("chat.placeholder")
              : t("chat.conversationClosed")
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
    </div>
  );
};

export default TransferChat;