"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function TestAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Test</h1>
      
      {session ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="font-semibold text-green-800">✅ Signed In</h2>
            <p className="text-green-700">Email: {session.user?.email}</p>
            <p className="text-green-700">Name: {session.user?.name}</p>
            {session.user?.image && (
              <img src={session.user.image} alt="Profile" className="w-12 h-12 rounded-full mt-2" />
            )}
          </div>
          
          <Button onClick={() => signOut()} variant="outline">
            Sign Out
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <h2 className="font-semibold">❌ Not Signed In</h2>
          </div>
          
          <div className="space-y-2">
            <Button onClick={() => signIn("google")} className="w-full">
              Sign in with Google
            </Button>
            <Button onClick={() => signIn("github")} className="w-full" variant="outline">
              Sign in with GitHub
            </Button>
            <Button onClick={() => signIn()} className="w-full" variant="secondary">
              Sign in (Default)
            </Button>
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800">Debug Info:</h3>
        <pre className="text-sm text-blue-700 mt-2">
          Status: {status}
          {'\n'}Session: {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}