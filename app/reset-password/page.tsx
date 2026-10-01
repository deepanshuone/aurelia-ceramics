import type { Metadata } from "next";
import Link from "next/link";
import { verifyResetToken } from "../../lib/password-reset";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Choose a New Password",
  description: "Choose a new password for your Aurelia Ceramics account.",
};

type PageProps = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : undefined;
  const customer = await verifyResetToken(value);

  return (
    <main className="auth-page">
      <div className="auth-container">
        <p className="section-label">ACCOUNT HELP</p>

        <h1>
          Choose a new
          <br />
          <em>password.</em>
        </h1>

        {customer && value ? (
          <ResetPasswordForm token={value} />
        ) : (
          <div className="form auth-form form-success">
            <h3>This link has expired</h3>
            <p>This password reset link is invalid, already used, or older than 60 minutes. Please request a new one.</p>
            <p className="auth-switch">
              <Link href="/forgot-password">Send me a new link</Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
