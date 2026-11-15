import { useEffect, useState } from "react";
import { createSession, rosterStatus } from "./logic";
import { PlayScreen } from "./play";
import { SetupScreen } from "./setup";
import { loadStore, saveStore } from "./storage";
import type { Session, SetupDraft } from "./types";

export function App() {
  const [draft, setDraft] = useState<SetupDraft>(() => loadStore().draft);
  const [session, setSession] = useState<Session | null>(() => loadStore().session);

  useEffect(() => {
    saveStore({ version: 1, draft, session });
  }, [draft, session]);

  if (session) {
    return (
      <PlayScreen
        session={session}
        onSession={(update) => setSession((current) => (current ? update(current) : current))}
        onRetire={(nextDraft) => {
          setDraft(nextDraft);
          setSession(null);
        }}
      />
    );
  }

  return (
    <SetupScreen
      draft={draft}
      onDraft={setDraft}
      onStart={() => {
        if (!rosterStatus(draft).ok) return;
        setSession(createSession(draft));
      }}
    />
  );
}
