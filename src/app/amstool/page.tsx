import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  AmstoolDashboardSection,
  AmstoolDashboardSkeleton,
} from "@/components/amstool-dashboard-section";

export default async function AmstoolPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AMSTOOL</h1>
        <p className="text-muted-foreground mt-1">
          Uses each customer&apos;s{" "}
          <span className="font-medium text-foreground">topology stub</span> to
          filter <code className="text-sm">amstool list</code> (like{" "}
          <code className="text-sm">grep -i</code>), then lists instances under
          each AMS topology.
        </p>
      </div>

      <Suspense fallback={<AmstoolDashboardSkeleton />}>
        <AmstoolDashboardSection />
      </Suspense>
    </div>
  );
}
