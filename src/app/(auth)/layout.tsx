import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-10">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-600 text-white shadow-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <rect width="14" height="18" x="5" y="3" rx="2" />
            <path d="M9 8h6" />
            <path d="M9 12h6" />
            <path d="M9 16h4" />
          </svg>
        </span>
        <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
