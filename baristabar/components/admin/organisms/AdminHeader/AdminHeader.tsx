import { Bell, User } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <h1 className="text-lg font-semibold">BaristaBar Admin</h1>
      </div>

      <div className="flex items-center gap-2" aria-label="Espace administrateur">
       
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground"
        >
          <Bell className="h-5 w-5" />
        </span>
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground"
        >
          <User className="h-5 w-5" />
        </span>
      </div>
    </header>
  );
}
