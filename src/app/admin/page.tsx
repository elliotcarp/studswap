import { redirect } from "next/navigation";
import { getAdminEmail } from "@/lib/adminAuth";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    redirect("/");
  }

  return <AdminDashboard />;
}
