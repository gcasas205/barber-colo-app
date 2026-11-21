"use server";

import { revalidatePath } from "next/cache";
import { listCustomers, setNickname, type ListCursor } from "@/modules/customers";
import { getActor } from "@/server/auth/actor";
import { customersStore } from "@/server/customers";

export type NicknameState = { error?: string; saved?: boolean };

/** RF-20: Colo pone, cambia o borra (vacío) un sobrenombre. La autorización está en el caso de uso. */
export async function saveNicknameAction(_prev: NicknameState, form: FormData): Promise<NicknameState> {
  const result = await setNickname(
    { store: customersStore() },
    await getActor(),
    String(form.get("customerId") ?? ""),
    String(form.get("nickname") ?? "").slice(0, 200),
  );
  if (!result.ok) return { error: result.error === "NICKNAME_LENGTH" ? "NICKNAME_LENGTH" : "TRY_AGAIN" };
  revalidatePath("/colo");
  return { saved: true };
}

/** RF-19: la siguiente tanda de 50. */
export async function loadMoreCustomers(after: ListCursor) {
  const result = await listCustomers({ store: customersStore() }, await getActor(), after);
  return result.ok ? result.value : { items: [], next: null };
}
