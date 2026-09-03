import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-5 py-24 text-muted">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
