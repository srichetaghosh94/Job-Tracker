import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Application, ApplicationInput } from "../types";

export type LoadState = "loading" | "ready" | "error";

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setApplications(await api.list());
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Mutations throw on failure so the caller can show the message where it fits.
  const create = useCallback(async (input: ApplicationInput) => {
    const created = await api.create(input);
    setApplications((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, input: ApplicationInput) => {
    const updated = await api.update(id, input);
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.remove(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { applications, state, error, reload: load, create, update, remove };
}
