"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    const record = () => {
      if (typeof window === "undefined") return;
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname + window.location.search }),
      }).catch(() => {
        // ignore errors
      });
    };

    record();
  }, []);

  return null;
}
