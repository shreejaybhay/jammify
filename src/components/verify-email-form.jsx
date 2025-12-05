"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const verifyEmailSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

function VerifyEmailFormContent() {
  const [isVerified, setIsVerified] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  const {
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    trigger,
  } = useForm({
    resolver: zodResolver(verifyEmailSchema),
  });

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Update form value
    setValue("code", newCode.join(""));
    
    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Trigger validation
    trigger("code");
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onSubmit = async (data) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp: data.code,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle error - you might want to show an error message
        console.error("Verification failed:", result.error);
        return;
      }

      setIsVerified(true);
    } catch (error) {
      console.error("Verification error:", error);
    }
  };

  const resendCode = async () => {
    console.log("Resending code...");
    // Simulate resend
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // Check if this is for password reset or registration
  const isPasswordReset = searchParams.get("reset") === "true";

  if (isVerified) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Email verified!</h2>
          <p className="text-muted-foreground mb-6">
            {isPasswordReset 
              ? "Your email has been successfully verified. You can now reset your password."
              : "Your email has been successfully verified. You can now sign in to your account."
            }
          </p>
          <Button asChild className="w-full">
            <a href={isPasswordReset ? "/reset-password" : "/login"}>
              {isPasswordReset ? "Continue to reset password" : "Sign in to your account"}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-6">
          We sent a code to <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Code input */}
        <div className="flex justify-center space-x-2">
          {code.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-lg font-semibold"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || code.join("").length !== 6}>
          {isSubmitting ? "Verifying..." : "Verify code"}
        </Button>
      </form>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          <button
            onClick={resendCode}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Resend code
          </button>
        </p>
        
        <a
          href="/forgot-password"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to forgot password
        </a>
      </div>
    </div>
  );
}
export def
ault function VerifyEmailForm() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    }>
      <VerifyEmailFormContent />
    </Suspense>
  );
}