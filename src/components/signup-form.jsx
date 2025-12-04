"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Github, Mail, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const handleSocialSignup = async (provider) => {
    try {
      const result = await signIn(provider, {
        callbackUrl: "/music",
        redirect: false,
      });
      
      if (result?.error) {
        setError("Authentication failed. Please try again.");
      } else if (result?.ok) {
        router.push("/music");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    }
  };

  const onSubmit = async (data) => {
    try {
      setError("");
      setSuccess("");
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Registration failed");
        return;
      }

      if (result.requiresVerification) {
        setSuccess("Account created! Please check your email for verification code.");
        // Redirect to verify email page with email parameter (not for password reset)
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}&reset=false`);
        }, 2000);
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Error/Success messages */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-md">
          {success}
        </div>
      )}

      {/* Social signup buttons */}
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full h-11" 
          type="button"
          onClick={() => handleSocialSignup("google")}
        >
          <Mail className="w-4 h-4 mr-2" />
          Continue with Google
        </Button>
        <Button 
          variant="outline" 
          className="w-full h-11" 
          type="button"
          onClick={() => handleSocialSignup("github")}
        >
          <Github className="w-4 h-4 mr-2" />
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Signup form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            {...register("name")}
            aria-invalid={errors.name ? "true" : "false"}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register("email")}
            aria-invalid={errors.email ? "true" : "false"}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              className="pr-10"
              {...register("password")}
              aria-invalid={errors.password ? "true" : "false"}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {/* Terms and privacy */}
      <p className="text-xs text-muted-foreground text-center">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="text-primary hover:text-primary/80">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-primary hover:text-primary/80">
          Privacy Policy
        </a>
      </p>

      {/* Sign in link */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium text-primary hover:text-primary/80"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}