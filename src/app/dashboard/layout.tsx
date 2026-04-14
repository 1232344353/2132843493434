import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardShell } from "./dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell sidebar={<DashboardSidebar />}>
      {children}
    </DashboardShell>
  );
}
