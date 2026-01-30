import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function GetUserIdPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your User ID</h1>
        <p className="text-muted-foreground">
          Use this ID to seed the database with your user data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clerk User ID</CardTitle>
          <CardDescription>
            Copy this ID and use it to seed the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm font-mono px-4 py-2">
              {userId}
            </Badge>
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-semibold">To seed the database with your data:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Copy your User ID above</li>
              <li>Open your terminal</li>
              <li>Run: <code className="bg-muted px-2 py-1 rounded">npm run seed YOUR_USER_ID</code></li>
            </ol>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs font-mono">
                npm run seed {userId}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
