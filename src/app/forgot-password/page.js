import ForgotPasswordForm from "@/components/forgot-password-form";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata = {
  title: "Forgot Password - Jammify",
  description: "Reset your Jammify password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 right-6">
        <ModeToggle />
      </div>
      
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password</h1>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        
        {/* Form */}
        <ForgotPasswordForm />
      </div>
    </div>
  );
}