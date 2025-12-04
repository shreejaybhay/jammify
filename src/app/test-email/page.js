"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TestEmail() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const testEmail = async () => {
    if (!email || !name) {
      setResult({ error: "Please fill in both fields" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to send test email" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Email Service</h1>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your-email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={testEmail} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Sending..." : "Send Test Email"}
        </Button>
        
        {result && (
          <div className={`p-4 rounded border ${
            result.success 
              ? "bg-green-50 border-green-200 text-green-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {result.success ? (
              <div>
                <p className="font-semibold">✅ Email sent successfully!</p>
                <p className="text-sm">Test OTP: {result.otp}</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold">❌ Failed to send email</p>
                <p className="text-sm">{result.error}</p>
                {result.details && (
                  <p className="text-xs mt-1">Details: {result.details}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
        <h3 className="font-semibold text-blue-800">Email Configuration:</h3>
        <p className="text-blue-700">
          Make sure your Gmail App Password is correctly set in the .env file.
        </p>
      </div>
    </div>
  );
}