import { Bell, User } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <h1 className="text-lg font-semibold">BaristaBar Admin</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Profile"
        >
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}