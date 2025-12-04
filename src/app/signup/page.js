import SignupForm from "@/components/signup-form";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata = {
  title: "Sign Up - Jammify",
  description: "Create your Jammify account",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 right-6">
        <ModeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Simple logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Jammify</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        {/* Signup form */}
        <SignupForm />
      </div>
    </div>
  );
}