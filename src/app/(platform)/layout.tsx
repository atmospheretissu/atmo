import { Sidebar } from "@/components/shell/sidebar";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
