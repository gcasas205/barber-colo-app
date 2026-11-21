"use client";

import { useState, useTransition } from "react";
import type { CustomerListItem, ListCursor } from "@/modules/customers";
import { Button } from "@/ui/Button";
import { loadMoreCustomers } from "./actions";
import { CustomerCard } from "./CustomerCard";
import { NicknameEditor } from "./NicknameEditor";

/** RF-19: la lista de a 50 con "Ver más". */
export function CustomerList({ initial, next: initialNext }: { initial: CustomerListItem[]; next: ListCursor | null }) {
  const [extra, setExtra] = useState<CustomerListItem[]>([]);
  const [next, setNext] = useState(initialNext);
  const [pending, start] = useTransition();
  const items = [...initial, ...extra];

  if (items.length === 0) {
    return <p className="text-tinta-suave">Todavía no hay clientes registrados. Cuando alguien entre con su cuenta o como invitado, va a aparecer acá.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((c) => (
          <li key={c.id}>
            <CustomerCard customer={c} editor={<NicknameEditor customerId={c.id} nickname={c.nickname} name={c.fullName} />} />
          </li>
        ))}
      </ul>
      {next ? (
        <Button
          variant="secundario"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const page = await loadMoreCustomers(next);
              setExtra((prev) => [...prev, ...page.items]);
              setNext(page.next);
            })
          }
        >
          {pending ? "Cargando…" : "Ver más"}
        </Button>
      ) : null}
    </div>
  );
}
