import { Suspense } from "react";
import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <Suspense>
        <SignInForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
