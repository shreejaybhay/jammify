"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import MusicLoader from "@/components/music-loader";

export default function music() {
  const { data: session, status } = useSession();

  // Show loading state if session is still loading
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MusicLoader />
      </div>
    );
  }

  // Don't render if no session (middleware will handle redirect)
  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-6 right-6">
        <ModeToggle />
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Jammify</h1>
            <p className="text-muted-foreground">You're successfully signed in!</p>
          </div>

          {/* User Info Card */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4 mb-4">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary">
                    {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-foreground">{session.user.name || "User"}</h2>
                <p className="text-muted-foreground">{session.user.email}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-medium text-foreground mb-2">Session Information</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>User ID: {session.user.id || "N/A"}</p>
                <p>Email: {session.user.email || "N/A"}</p>
                <p>Name: {session.user.name || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>

            <div className="text-center">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}