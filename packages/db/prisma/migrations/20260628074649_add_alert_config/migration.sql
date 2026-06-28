-- CreateEnum
CREATE TYPE "AlertTipo" AS ENUM ('PAGAR', 'RECEBER', 'AMBOS');

-- CreateTable
CREATE TABLE "alert_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "diasAntes" INTEGER NOT NULL,
    "tipo" "AlertTipo" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_configs_tenantId_idx" ON "alert_configs"("tenantId");
