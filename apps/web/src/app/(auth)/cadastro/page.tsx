import { SignUp } from "@clerk/nextjs";

export default function CadastroPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp path="/cadastro" routing="path" signInUrl="/entrar" />
    </div>
  );
}
