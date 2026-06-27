-- CreateTable
CREATE TABLE "tabelas_preco" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabelas_preco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tabelas_preco_tenantId_idx" ON "tabelas_preco"("tenantId");
