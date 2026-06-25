import { PrismaClient } from "@prisma/client";

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

export { Prisma, AccountType, MovementType } from "@prisma/client";
export type {
  Tenant, User, Plan, UserRole,
  Cliente, Fornecedor, Produto, Deposito,
  StockBalance, StockMovement, InventoryCount, InventoryCountItem,
} from "@prisma/client";
