"use client";
import { useEffect, useState } from "react";

/**
 * G-116: the hidden field that makes a typed time an instant. Filled on
 * mount from the browser's own IANA zone; the server refuses a write
 * without it, so a submit before hydration (or with JS off) refuses
 * VISIBLY as bad input rather than storing a wall clock as UTC, which is
 * the fail-closed direction the ruling's guard demands.
 */
export function TimezoneField() {
  const [tz, setTz] = useState("");
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      // leave empty; the server wall refuses and says so
    }
  }, []);
  return <input type="hidden" name="tz" value={tz} readOnly />;
}
