"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closeSupportTicket,
  getSupportTicketMessages,
  getSupportTickets,
  replySupportTicket,
} from "@/lib/api";
import { SupportMessage, SupportTicket, SupportTicketStatus } from "@/types";

export default function SupportPage() {
  const [status, setStatus] = useState<SupportTicketStatus>("OPEN");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId],
  );

  async function loadTickets(reset: boolean) {
    try {
      setError(null);
      if (reset) setLoadingTickets(true);
      else setLoadingMore(true);

      const nextOffset = reset ? 0 : tickets.length;
      const res = await getSupportTickets({ status, offset: nextOffset, limit: 20 });

      setTotal(res.total);
      setTickets((prev) => (reset ? res.items : [...prev, ...res.items]));

      if (reset) {
        if (res.items.length > 0) {
          setSelectedTicketId((current) => (
            current && res.items.some((ticket) => ticket.id === current)
              ? current
              : res.items[0].id
          ));
        }
        else {
          setSelectedTicketId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить тикеты");
    } finally {
      setLoadingTickets(false);
      setLoadingMore(false);
    }
  }

  async function loadMessages(ticketId: number) {
    try {
      setError(null);
      setLoadingMessages(true);
      const data = await getSupportTicketMessages(ticketId);
      setMessages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить сообщения");
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    setSelectedTicketId(null);
    setMessages([]);
    loadTickets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (selectedTicketId == null) {
      setMessages([]);
      return;
    }
    loadMessages(selectedTicketId);
  }, [selectedTicketId]);

  const canLoadMore = tickets.length < total;

  async function onSendReply() {
    if (!selectedTicketId || !replyText.trim() || sending) return;
    try {
      setSending(true);
      setError(null);
      await replySupportTicket(selectedTicketId, replyText.trim());
      setReplyText("");
      await Promise.all([loadMessages(selectedTicketId), loadTickets(true)]);
      setSelectedTicketId(selectedTicketId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить ответ");
    } finally {
      setSending(false);
    }
  }

  async function onCloseTicket() {
    if (!selectedTicketId || closing) return;
    try {
      setClosing(true);
      setError(null);
      await closeSupportTicket(selectedTicketId);

      if (status === "OPEN") {
        setSelectedTicketId(null);
        setMessages([]);
        await loadTickets(true);
      } else {
        await Promise.all([loadTickets(true), loadMessages(selectedTicketId)]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось закрыть тикет");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
      <section className="w-[340px] min-w-[300px] max-w-[380px] card border border-soft rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-soft flex items-center gap-2">
          <button
            className={`btn h-9 ${status === "OPEN" ? "btn-success" : ""}`}
            onClick={() => setStatus("OPEN")}
          >
            Открытые
          </button>
          <button
            className={`btn h-9 ${status === "CLOSED" ? "btn-info" : ""}`}
            onClick={() => setStatus("CLOSED")}
          >
            Закрытые
          </button>
          <button className="btn h-9 ml-auto" onClick={() => loadTickets(true)} disabled={loadingTickets}>
            Обновить
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingTickets ? (
            <div className="p-4 text-muted">Загрузка...</div>
          ) : tickets.length === 0 ? (
            <div className="p-4 text-muted">Тикетов нет</div>
          ) : (
            <ul>
              {tickets.map((ticket) => {
                const active = ticket.id === selectedTicketId;
                return (
                  <li key={ticket.id}>
                    <button
                      className={`w-full text-left px-3 py-3 border-b border-soft hover-surface ${active ? "bg-black/5 dark:bg-white/10" : ""}`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">Тикет #{ticket.id}</span>
                        <span className={`badge ${ticket.status === "OPEN" ? "badge-warning" : "badge-success"}`}>
                          {ticket.status === "OPEN" ? "OPEN" : "CLOSED"}
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        Клиент: {ticket.customerId}
                        {ticket.customerName ? ` · ${ticket.customerName}` : ""}
                      </div>
                      <div className="text-xs text-muted mt-1">Последнее: {new Date(ticket.lastMessageAt).toLocaleString()}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {canLoadMore && (
          <div className="p-3 border-t border-soft">
            <button className="btn w-full h-9" onClick={() => loadTickets(false)} disabled={loadingMore}>
              {loadingMore ? "Загрузка..." : "Загрузить ещё"}
            </button>
          </div>
        )}
      </section>

      <section className="min-w-0 flex-1 card border border-soft rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-soft flex items-center gap-2">
          <div className="font-semibold">
            {selectedTicket ? `Тикет #${selectedTicket.id}` : "Выберите тикет"}
          </div>
          {selectedTicket && (
            <button className="btn h-9 ml-auto" onClick={() => loadMessages(selectedTicket.id)} disabled={loadingMessages}>
              Обновить чат
            </button>
          )}
          {selectedTicket?.status === "OPEN" && (
            <button className="btn btn-danger h-9" onClick={onCloseTicket} disabled={closing}>
              {closing ? "Закрываем..." : "Закрыть тикет"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!selectedTicket ? (
            <div className="text-muted">Слева выберите тикет, чтобы увидеть переписку.</div>
          ) : loadingMessages ? (
            <div className="text-muted">Загрузка сообщений...</div>
          ) : messages.length === 0 ? (
            <div className="text-muted">В этом тикете пока нет сообщений.</div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "USER";
              const label = isUser ? "Клиент" : message.role === "ADMIN" ? "Админ" : "Ассистент";
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 ${isUser ? "bg-black/5 dark:bg-white/10" : "bg-[var(--primary)] text-white"}`}>
                    <div className={`text-xs mb-1 ${isUser ? "text-muted" : "text-white/80"}`}>
                      {label} · {new Date(message.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedTicket && (
          <div className="p-3 border-t border-soft">
            <div className="flex gap-2">
              <textarea
                className="ui-input min-h-[44px] max-h-32 resize-y flex-1"
                placeholder={selectedTicket.status === "OPEN" ? "Введите ответ клиенту" : "Тикет закрыт"}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={selectedTicket.status !== "OPEN" || sending}
              />
              <button
                className="btn btn-success h-11 px-5"
                onClick={onSendReply}
                disabled={selectedTicket.status !== "OPEN" || sending || !replyText.trim()}
              >
                {sending ? "Отправка..." : "Ответить"}
              </button>
            </div>
            {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
          </div>
        )}
      </section>
    </div>
  );
}
