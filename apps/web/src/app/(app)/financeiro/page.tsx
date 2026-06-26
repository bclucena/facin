export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation";

export default function FinanceiroPage() {
  redirect("/financeiro/contas-a-pagar");
}