import { AdminHeader } from "@/components/admin/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/admin/organisms/AdminSignOutButton/AdminSignOutButton";
import { CustomersManager } from "./CustomersManager";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#FBF8F4] text-[#3B2418]">
      <AdminHeader />
      <section className="mx-auto w-full max-w-360 px-4 pb-12 pt-5 sm:px-8 lg:px-12">
        <div className="mb-4 flex justify-end">
          <AdminSignOutButton />
        </div>
        <CustomersManager />
      </section>
    </main>
  );
}
