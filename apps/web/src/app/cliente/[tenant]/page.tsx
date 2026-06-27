import { redirect } from "next/navigation";

export default function TenantHomePage({ params }: { params: { tenant: string } }) {
  redirect(`/cliente/${params.tenant}/dashboard`);
}
