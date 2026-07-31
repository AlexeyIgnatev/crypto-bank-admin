import TronWalletPage from "@/components/TronWalletPage";

export default function TronWallet2Page() {
  return (
    <TronWalletPage
      storageKey="tron-wallet2-private-key"
      customerIdKey="tron-wallet2-customer-id"
      walletId="tron-wallet2"
      title="External AML Wallet 1"
      badgeLabel="AML test"
      subtitle="Тестовый внешний кошелёк из AML-списка: спонсорство терроризма."
    />
  );
}
