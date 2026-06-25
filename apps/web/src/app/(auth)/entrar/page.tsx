import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function EntrarPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignIn path="/entrar" routing="path" signUpUrl="/cadastro" />
    </div>
  );
}
