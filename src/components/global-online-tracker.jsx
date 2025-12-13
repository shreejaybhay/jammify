"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Global Activity Tracker Component
 * This component runs on every page to track user activity for analytics
 * It's lightweight and handles basic activity tracking - no UI rendering
 */
export function GlobalOnlineTracker() {
  const { data: session, status } = useSession();
  const lastActivityRef = useRef(Date.now());

  // Track user activity for analytics
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // You can add analytics tracking here if needed
    // For example: track page views, user engagement, etc.
    if (process.env.NODE_ENV === "development") {
      console.log("📊 User activity tracked:", new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated" || !session?.user?.email) {
      return;
    }

    // Only proceed if authenticated
    if (status === "authenticated" && session?.user?.email) {
      // Basic activity tracking for analytics
      const handleUserActivity = (event) => {
        if (status !== "authenticated") return;
        trackActivity();
      };

      // Activity detection events (simplified)
      const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

      // Visibility change handling for analytics
      const handleVisibilityChange = () => {
        if (!document.hidden && status === "authenticated") {
          trackActivity();
        }
      };

      // Add event listeners
      document.addEventListener("visibilitychange", handleVisibilityChange);

      events.forEach((event) => {
        document.addEventListener(event, handleUserActivity, { passive: true });
      });

      return () => {
        // Cleanup
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );

        events.forEach((event) => {
          document.removeEventListener(event, handleUserActivity);
        });
      };
    }
  }, [status, session?.user?.email, trackActivity]);

  // This component doesn't render anything - it's just for tracking
  return null;
}
