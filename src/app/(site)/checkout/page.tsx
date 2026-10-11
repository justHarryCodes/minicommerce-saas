import { notFound, redirect } from "next/navigation";
import { getCompany, getCurrentCustomer } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import CheckoutClient from "./CheckoutClient";

export const metadata = { title: "Checkout" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; failed?: string; order?: string }>;
}) {
  const sp = await searchParams;

  const company = await getCompany();
  if (!company) notFound();

  const current = await getCurrentCustomer();
  if (!current) redirect("/account/login?next=%2Fcheckout");
  const { customer, session } = current;

  // Result of a Paystack redirect. Only trust it for an order that is
  // paid AND belongs to this customer.
  let paystackResult: "success" | "failed" | null = null;
  let paidOrderNumber: string | null = null;
  if (sp.success === "true" && sp.order && UUID_RE.test(sp.order)) {
    const paid = await queryOne<{ order_number: string }>(
      "SELECT order_number FROM orders WHERE id = $1 AND customer_id = $2 AND payment_status = 'paid'",
      [sp.order, customer.id],
    );
    if (paid) {
      paystackResult = "success";
      paidOrderNumber = paid.order_number;
    }
  } else if (sp.failed === "true") {
    paystackResult = "failed";
  }

  const paymentMethods: string[] = [];
  if (
    company.paymentPreference === "paystack" ||
    company.paymentPreference === "both" ||
    !company.paymentPreference
  ) {
    paymentMethods.push("paystack");
  }
  if (
    company.paymentPreference === "bank_transfer" ||
    company.paymentPreference === "both"
  ) {
    paymentMethods.push("transfer");
  }

  return (
    <CheckoutClient
      storeId={company.id}
      paymentMethods={paymentMethods}
      bankName={company.bankName ?? company.bank_name}
      accountNumber={company.bankAccountNumber ?? company.bank_account_number}
      accountName={company.bankAccountName ?? company.bank_account_name}
      whatsapp={company.whatsapp}
      paystackResult={paystackResult}
      paidOrderNumber={paidOrderNumber}
      customer={{
        name: customer.name ?? session.displayName ?? "",
        email: customer.email ?? session.email,
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        state: customer.state ?? "",
      }}
    />
  );
}
