"use client";

import { useUserActivity } from '@/hooks/useUserActivity';

/**
 * Simple component to automatically track user activity
 * Add this to any page where you want to track user visits
 */
export default function UserActivityTracker({ 
  enabled = true,
  recordOnMount = true,
  recordOnFocus = true,
  recordOnVisibilityChange = true 
}) {
  useUserActivity({
    enabled,
    recordOnMount,
    recordOnFocus,
    recordOnVisibilityChange
  });

  // This component renders nothing - it just tracks activity
  return null;
}