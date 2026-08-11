import { useEffect, useRef, useState } from "react";

import type { Task } from "@/src/domain/types";

import { getSupabaseClient } from "./supabase";
import { createSupabaseTaskSync } from "./taskSync";

export type SyncStatus = "disabled" | "error" | "synced" | "syncing";

export function useTaskSync(tasks: Task[], onRemoteTasks: (tasks: Task[]) => void) {
  const [status, setStatus] = useState<SyncStatus>("disabled");
  const [authVersion, setAuthVersion] = useState(0);
  const userId = useRef<string | null>(null);
  const fingerprint = useRef("");
  const onRemoteTasksRef = useRef(onRemoteTasks);
  onRemoteTasksRef.current = onRemoteTasks;
  const client = getSupabaseClient();

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        userId.current = data.session?.user.id ?? null;
        setAuthVersion((value) => value + 1);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      userId.current = session?.user.id ?? null;
      fingerprint.current = "";
      setAuthVersion((value) => value + 1);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !userId.current) {
      setStatus("disabled");
      return;
    }
    const nextFingerprint = taskFingerprint(tasks);
    if (nextFingerprint === fingerprint.current) return;

    let active = true;
    setStatus("syncing");
    void createSupabaseTaskSync(client).sync(userId.current, tasks)
      .then((merged) => {
        if (!active) return;
        fingerprint.current = taskFingerprint(merged);
        onRemoteTasksRef.current(merged);
        setStatus("synced");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => { active = false; };
  }, [authVersion, client, tasks]);

  return status;
}

function taskFingerprint(tasks: Task[]) {
  return tasks.map((task) => `${task.id}:${task.updatedAt ?? task.createdAt}`).sort().join("|");
}
