"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { getAllUsers } from "@/app/actions/customers";

type User = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | undefined;
  imageUrl: string;
};

type AddCoverCSEDialogProps = {
  onSelectUser: (userId: string, userName: string) => void;
};

export function AddCoverCSEDialog({ onSelectUser }: AddCoverCSEDialogProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);
      
      getAllUsers()
        .then((fetchedUsers) => {
          setUsers(fetchedUsers);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load users");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open]);

  const handleSelectUser = (user: User) => {
    startTransition(() => {
      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.emailAddress || "Unknown User";
      onSelectUser(user.id, userName);
      setOpen(false);
    });
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    return user.emailAddress || "Unknown User";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Cover CSE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Cover CSE</DialogTitle>
          <DialogDescription>
            Select a user from the system to add as a cover CSE
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No users found
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                disabled={isPending}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img
                  src={user.imageUrl}
                  alt={getUserDisplayName(user)}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 text-left">
                  <div className="font-medium">{getUserDisplayName(user)}</div>
                  {user.emailAddress && (
                    <div className="text-sm text-muted-foreground">{user.emailAddress}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
