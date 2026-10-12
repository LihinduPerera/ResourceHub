
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ResourceForm from "./ResourceForm";

async function ResourcesContent() {
  await connection();

  const resources = await prisma.resource.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      capacity: true,
      isActive: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-6 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-teal-700"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-bold md:text-3xl">
              Resources
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage rooms and shared spaces in your workspace.
            </p>
          </div>

          <Link
            href="/reservations"
            className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            View reservations
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 p-5 md:p-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">All resources</h2>
              <p className="mt-1 text-sm text-slate-500">
                {resources.filter((resource) => resource.isActive).length}{" "}
                active resources
              </p>
            </div>
          </div>

          {resources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="font-semibold">No resources yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Create your first resource using the form.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {resources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-xl text-teal-700">
                      ▦
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        resource.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {resource.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    {resource.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {resource.type}
                  </p>

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Location</span>
                      <span className="text-right font-medium">
                        {resource.location}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Capacity</span>
                      <span className="font-medium">
                        {resource.capacity} people
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Resource ID</span>
                      <span className="font-medium">#{resource.id}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Add a resource</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add a room or shared space that people can reserve.
            </p>

            <div className="mt-6">
              <ResourceForm />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-5">
            <h3 className="font-semibold text-teal-900">
              Resource management tip
            </h3>
            <p className="mt-2 text-sm leading-6 text-teal-800">
              Deactivated resources remain in the database so that
              existing reservations keep their history.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] text-slate-600">
          Loading resources...
        </main>
      }
    >
      <ResourcesContent />
    </Suspense>
  );
}
