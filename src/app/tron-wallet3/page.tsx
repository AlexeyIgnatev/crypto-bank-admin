import TronWalletPage from "@/components/TronWalletPage";

export default function TronWallet3Page() {
  return (
    <TronWalletPage
      storageKey="tron-wallet3-private-key"
      customerIdKey="tron-wallet3-customer-id"
      walletId="tron-wallet3"
      title="External AML Wallet 2"
      badgeLabel="AML test"
      subtitle="Тестовый внешний кошелёк из AML-списка: санкционный риск."
    />
  );
}
