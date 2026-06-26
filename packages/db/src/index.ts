import { PrismaClient } from "../../../apps/web/src/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export { Prisma, AccountType, MovementType, PaymentType, BillStatus, CashFlowType, QuoteStatus, OrderStatus, SalesOrderStatus } from "../../../apps/web/src/generated/prisma";
export type {
  Tenant, User, Plan, UserRole,
  Cliente, Fornecedor, Produto, Deposito,
  StockBalance, StockMovement, InventoryCount, InventoryCountItem,
  AccountsPayable, AccountsReceivable, CashFlow,
  PurchaseQuote, PurchaseQuoteItem, PurchaseOrder, PurchaseOrderItem,
  SalesOrder, SalesOrderItem,
} from "../../../apps/web/src/generated/prisma";
