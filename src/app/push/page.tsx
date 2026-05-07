"use client";

import { useState } from "react";
import { sendBroadcastPush } from "@/lib/api";

export default function PushPage() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<null | { successful: boolean; skipped?: boolean; sent?: number; failed?: number; details?: string[] }>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !text.trim() || sending) return;

    try {
      setSending(true);
      setError(null);
      setResult(null);

      const response = await sendBroadcastPush({
        title: title.trim(),
        text: text.trim(),
        url: url.trim() || undefined,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить push-рассылку");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
      <div className="card border border-soft rounded-xl p-4 max-w-3xl">
        <div className="text-lg font-semibold mb-1">Рассылка push-уведомлений</div>
        <div className="text-sm text-muted mb-4">
          Отправка пойдет всем пользователям с включенными push-уведомлениями и активными Android FCM-токенами.
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm mb-1 block">Заголовок</label>
            <input
              className="ui-input w-full"
              placeholder="Например: Важное обновление"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="text-sm mb-1 block">Текст</label>
            <textarea
              className="ui-input w-full min-h-[120px]"
              placeholder="Введите текст уведомления"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              required
            />
          </div>

          <div>
            <label className="text-sm mb-1 block">Ссылка (опционально)</label>
            <input
              className="ui-input w-full"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button type="submit" className="btn btn-success h-10 px-5" disabled={sending || !title.trim() || !text.trim()}>
              {sending ? "Отправка..." : "Отправить всем"}
            </button>
            <button
              type="button"
              className="btn h-10"
              disabled={sending}
              onClick={() => {
                setTitle("");
                setText("");
                setUrl("");
                setResult(null);
                setError(null);
              }}
            >
              Очистить
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="card border border-red-500/40 rounded-xl p-4 max-w-3xl">
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      )}

      {result && (
        <div className="card border border-soft rounded-xl p-4 max-w-3xl">
          <div className="font-medium mb-2">Результат отправки</div>
          <div className="text-sm grid grid-cols-1 gap-1">
            <div>Успешно: {result.successful ? "Да" : "Нет"}</div>
            <div>Отправлено: {result.sent ?? 0}</div>
            <div>Ошибок: {result.failed ?? 0}</div>
            <div>Пропущено: {result.skipped ? "Да" : "Нет"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
