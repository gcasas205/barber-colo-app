import type { PhoneE164 } from "../domain/phone";
import type { Birthday } from "../domain/profile";
import type { DemoKind } from "@/modules/identity";

export type CustomerRow = {
  id: string;
  role: "holder" | "dependent" | "guest";
  accountUserId: string | null;
  fullName: string;
  phone: PhoneE164 | null;
  birthday: Birthday | null;
  nickname: string | null;
  isDemo: boolean;
  createdAt: Date;
};

export type CustomerListItem = Pick<CustomerRow, "id" | "role" | "fullName" | "phone" | "nickname" | "isDemo" | "createdAt">;
export type ListCursor = { createdAt: Date; id: string };

/** Operaciones de clientes dentro de una transacción. */
export interface CustomersTx {
  /** Dueño activo del teléfono, con la fila bloqueada hasta el final de la transacción. */
  lockPhoneOwner(phone: PhoneE164): Promise<CustomerRow | null>;
  getCustomer(id: string): Promise<CustomerRow | null>;
  updateProfile(id: string, profile: { fullName: string; phone: PhoneE164; birthday: Birthday | null }): Promise<void>;
  linkGuest(guestId: string, holderId: string): Promise<void>;
  recordPhoneChange(change: { customerId: string; oldPhone: string | null; newPhone: string; changedBy: string }): Promise<void>;
  countGuestAttempts(ipHash: string, since: Date): Promise<number>;
  recordGuestAttempt(ipHash: string, at: Date): Promise<void>;
  createGuest(guest: { fullName: string; phone: PhoneE164 }): Promise<string>;
  addGuestDevice(authUserId: string, customerId: string): Promise<void>;
  findDemoAccount(authUserId: string): Promise<{ kind: DemoKind; customerId: string | null } | null>;
  saveDemoAccount(authUserId: string, kind: DemoKind, customerId: string | null): Promise<void>;
  createDemoHolder(authUserId: string, fullName: string): Promise<string>;
  listCustomers(limit: number, after: ListCursor | null): Promise<CustomerListItem[]>;
  setNickname(customerId: string, nickname: string | null): Promise<boolean>;
}

export interface CustomersStore {
  transaction<T>(fn: (tx: CustomersTx) => Promise<T>): Promise<T>;
}

/** Error de la base por teléfono duplicado (dos personas cargaron el mismo número a la vez). */
export class PhoneConflictError extends Error {
  constructor() {
    super("PHONE_CONFLICT");
  }
}
