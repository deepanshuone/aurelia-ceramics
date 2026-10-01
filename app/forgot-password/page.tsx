import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Forgot Password",
  description: "Reset your Aurelia Ceramics account password.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <div className="auth-container">
        <p className="section-label">ACCOUNT HELP</p>

        <h1>
          Forgot your
          <br />
          <em>password?</em>
        </h1>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
