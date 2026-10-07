import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";
import { isSmsConfigured } from "../../lib/sms";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Create Account",
  description: "Create an Aurelia Ceramics account to track orders and manage your details.",
};

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="auth-container">
        <p className="section-label">JOIN AURELIA</p>

        <h1>
          Create your
          <br />
          <em>account.</em>
        </h1>

        <RegisterForm verifyPhone={isSmsConfigured()} />
      </div>
    </main>
  );
}
