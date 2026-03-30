import { SiteFooter } from "@/components/site-footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-backdrop" aria-hidden="true" />
      <div className="dashboard-content">
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
