// src/app/(customer)/layout.tsx
import { headers } from "next/headers";
import { getBrandByHost } from "@/lib/api/brands";
import "@/app/globals.css";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = headers().get("x-forwarded-host") || headers().get("host") || "";
  const brand = await getBrandByHost(host).catch(() => null);

  // Basic brand-aware shell (logo/colors would come from brand profile)
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* brand logo or name */}
              <div className="h-8 w-8 rounded bg-primary" />
              <span className="font-semibold">
                {brand?.profile?.displayName || brand?.name || "Brand"}
              </span>
            </div>

            {/* User avatar menu can host nested pages like /billing and /settings */}
            <nav className="flex items-center gap-4">
              {/* Placeholder; real menu will appear once we wire settings/billing */}
              <a className="text-sm opacity-70 hover:opacity-100" href="/proposals">
                Proposals
              </a>
              <a className="text-sm opacity-70 hover:opacity-100" href="/gate">
                Sign in
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
