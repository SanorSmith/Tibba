/**
 * Which facility to open, when someone belongs to more than one.
 *
 * Before this, `/d` sent everyone to `workspaces[0]` — ordered by facility
 * creation date, so a doctor at one hospital and an administrator at another
 * landed in whichever had been created most recently. Their role had no
 * bearing on it, and creating a new facility silently changed where existing
 * people arrived.
 *
 * The role is shown next to each name because it is the thing that differs:
 * the same person is a doctor in one and an administrator in another, and
 * that changes what the screen behind the choice will even offer.
 *
 * Someone with a single facility never sees this — they are redirected
 * straight in, as before.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, ChevronRight } from "lucide-react";

export type PickerWorkspace = {
  workspaceid: string;
  name: string;
  type: string | null;
  role: string;
};

/** `lab_technician` reads badly in a list of proper nouns. */
function humanRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WorkspacePicker({ workspaces }: { workspaces: PickerWorkspace[] }) {
  const router = useRouter();
  const [going, setGoing] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a facility</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You have access to {workspaces.length} facilities. You can switch at any time from the
        sidebar.
      </p>

      <ul className="mt-8 space-y-3">
        {workspaces.map((w) => {
          const busy = going === w.workspaceid;
          return (
            <li key={w.workspaceid}>
              <button
                type="button"
                disabled={going !== null}
                onClick={() => {
                  setGoing(w.workspaceid);
                  router.push(`/d/${w.workspaceid}`);
                }}
                className="group flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-60"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
                  <Building2 className="size-5 text-muted-foreground" aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{w.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {humanRole(w.role)}
                    {w.type ? ` · ${w.type}` : ""}
                  </span>
                </span>

                <ChevronRight
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    busy ? "animate-pulse" : "group-hover:translate-x-0.5"
                  }`}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
