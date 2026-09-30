import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Login",
  description: "Sign in to your Aurelia Ceramics account.",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-container">
        <p className="section-label">WELCOME BACK</p>

        <h1>
          Sign in to your
          <br />
          <em>account.</em>
        </h1>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
