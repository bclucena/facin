-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BOLETO', 'PIX', 'CHEQUE', 'PROMISSORIA', 'TED', 'DINHEIRO');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "paymentType" "PaymentType",
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_receivable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "receivedAmount" DECIMAL(12,2),
    "paymentType" "PaymentType",
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "CashFlowType" NOT NULL,
    "accountCode" TEXT,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_payable_tenantId_idx" ON "accounts_payable"("tenantId");

-- CreateIndex
CREATE INDEX "accounts_payable_tenantId_dueDate_idx" ON "accounts_payable"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "accounts_receivable_tenantId_idx" ON "accounts_receivable"("tenantId");

-- CreateIndex
CREATE INDEX "accounts_receivable_tenantId_dueDate_idx" ON "accounts_receivable"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "cash_flow_tenantId_idx" ON "cash_flow"("tenantId");

-- CreateIndex
CREATE INDEX "cash_flow_tenantId_referenceDate_idx" ON "cash_flow"("tenantId", "referenceDate");

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
