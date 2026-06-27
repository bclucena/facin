export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Painel Interno
        </span>
        <h1 className="mt-3 text-4xl font-bold text-primary">Facin Master</h1>
        <p className="mt-2 text-muted-foreground">
          Gestão de tenants, planos e onboarding
        </p>
      </div>
      <div className="mt-4 rounded-lg border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        <p>⚠️ Acesso restrito à equipe Facin</p>
      </div>
    </main>
  );
}
