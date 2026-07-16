"use client";

import TronWalletPage from "@/components/TronWalletPage";

export default function Page() {
  return (
    <TronWalletPage
      storageKey="tron-wallet-private-key"
      customerIdKey="tron-wallet-customer-id"
      walletId="tron-wallet"
      badgeLabel="Tron wallet"
      title="Тестовый TRON-кошелёк"
      subtitle="Фиксированный тестовый кошелёк. Страница открывается только по прямой ссылке."
    />
  );
}
