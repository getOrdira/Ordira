// src/app/(customer)/gate/page.tsx
import { redirect } from "next/navigation";
import { getApiBase, api } from "@/lib/apis/client";
import { setCustomerSession } from "@/lib/auth/session/session";
import { cookies, headers } from "next/headers";
import { useFormState, useFormStatus } from "react-dom";

type ActionState = { ok: boolean; message?: string };

async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  "use server";
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/proposals");

  try {
    // Backend user registration:
    // POST /api/auth/register/user  (email/password/register)  :contentReference[oaicite:7]{index=7}
    const res = await api.post<{ success: boolean; data: { token: string; verified?: boolean } }>(
      "/api/auth/register/user",
      { email, password }
    );

    await setCustomerSession({ token: res.data.token, verified: !!res.data.verified });
    redirect(next);
  } catch (e: any) {
    return { ok: false, message: e?.message || "Registration failed" };
  }
}

async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  "use server";
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const remember = form.get("remember") === "on";
  const next = String(form.get("next") || "/proposals");

  // Attach business context via Host header; backend uses resolveTenant.
  const host = headers().get("x-forwarded-host") || headers().get("host") || "";

  try {
    // Backend user login:
    // POST /api/auth/login/user  (supports domain-gating check in auth flow)  :contentReference[oaicite:8]{index=8}
    const res = await api.post<{ success: boolean; data: { token: string; verified?: boolean } }>(
      "/api/auth/login/user",
      {
        email,
        password,
        rememberMe: remember,
        // securityContext and businessId are supported in backend auth if provided
      },
      {
        headers: { "X-Tenant-Domain": host },
      }
    );

    await setCustomerSession({ token: res.data.token, verified: !!res.data.verified, maxAgeSec: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 6 });
    redirect(next);
  } catch (e: any) {
    return { ok: false, message: e?.message || "Invalid credentials" };
  }
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

export default function GatePage({
  searchParams,
}: {
  searchParams?: { next?: string; reason?: string };
}) {
  const next = searchParams?.next || "/proposals";
  const reason = searchParams?.reason;

  const [regState, regAction] = useFormState(registerAction, { ok: true });
  const [logState, logAction] = useFormState(loginAction, { ok: true });

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section className="rounded-lg border p-6">
        <h2 className="mb-2 text-lg font-semibold">Create your profile</h2>
        <p className="mb-4 text-sm opacity-75">
          You’ll use this email for all future brand voting sessions. (One authenticated session → one ballot.)
        </p>
        {!regState.ok && (
          <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">
            {regState.message}
          </div>
        )}
        <form action={regAction} className="grid gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-1 text-sm">
            <span>Email</span>
            <input name="email" type="email" required className="rounded border px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Password</span>
            <input name="password" type="password" required className="rounded border px-3 py-2" />
          </label>
          <SubmitBtn label="Create account" />
        </form>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="mb-2 text-lg font-semibold">Sign in</h2>
        {reason === "verify" && (
          <p className="mb-4 text-sm text-amber-700">
            Please sign in to verify your email before entering.
          </p>
        )}
        {!logState.ok && (
          <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">
            {logState.message}
          </div>
        )}
        <form action={logAction} className="grid gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-1 text-sm">
            <span>Email</span>
            <input name="email" type="email" required className="rounded border px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Password</span>
            <input name="password" type="password" required className="rounded border px-3 py-2" />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="remember" className="h-4 w-4" /> Keep me signed in
          </label>
          <SubmitBtn label="Sign in" />
        </form>
      </section>
    </div>
  );
}
