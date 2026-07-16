"use client";

import TronWalletPage from "@/components/TronWalletPage";

export default function Page() {
  return (
    <TronWalletPage
      storageKey="tron-wallet1-private-key"
      customerIdKey="tron-wallet1-customer-id"
      badgeLabel="Tron wallet 2"
      title="Внешний TRON-кошелёк"
      subtitle="Отдельный кошелёк для второго окна. Использует свой localStorage и не перетирает первый кошелёк."
    />
  );
}
