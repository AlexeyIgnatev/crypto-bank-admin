export default function Cards() {
  const Card = ({ title, value, accent = false }: { title: string; value: string; accent?: boolean }) => (
    <div
      className={`rounded-xl p-4 shadow-sm border transition-colors ${
        accent ? "bg-[var(--red)] text-white border-[color:var(--red-hover)]" : "card border-black/10 dark:border-white/10"
      }`}
    >
      <div className="text-sm text-muted">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="Общая сумма транзакций" value="123 000 000 ₸" accent />
      <Card title="Между банковскими счетами" value="23 000 000 ₸" />
      <Card title="Между криптокошельками" value="45 000 000 ₸" />
      <Card title="Количество пользователей" value="1 230 000" accent />
    </section>
  );
}
