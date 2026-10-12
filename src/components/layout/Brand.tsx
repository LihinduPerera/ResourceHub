import Link from "next/link";
import { APP_NAME, ROUTES } from "@/lib/constants";

/** Brand mark used in the app shell and auth screens. */
export function Brand() {
  return (
    <Link
      href={ROUTES.dashboard}
      className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-600 text-white shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5"
          aria-hidden="true"
        >
          <rect width="14" height="18" x="5" y="3" rx="2" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
