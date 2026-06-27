export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation";

export default function FinanceiroPage({ params }: { params: { tenant: string } }) {
  redirect(`/cliente/${params.tenant}/financeiro/contas-a-pagar`);
}
