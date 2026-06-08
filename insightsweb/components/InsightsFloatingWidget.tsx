import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { StoredUser } from "./InsightsChat";
import InsightsChatWidget from "./InsightsChatWidget";

export const AI_WIDGET_ROUTES: string[] = ["/insights"];

export default function InsightsFloatingWidget() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try { setUser(JSON.parse(stored)); } catch {}
  }, []);

  if (!AI_WIDGET_ROUTES.includes(router.pathname)) return null;

  return <InsightsChatWidget user={user} />;
}
