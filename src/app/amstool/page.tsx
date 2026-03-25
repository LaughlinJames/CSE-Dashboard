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
          Local topology cache from <code className="text-sm">amstool list</code>
        </p>
      </div>

      <Suspense fallback={<AmstoolDashboardSkeleton />}>
        <AmstoolDashboardSection />
      </Suspense>
    </div>
  );
}
