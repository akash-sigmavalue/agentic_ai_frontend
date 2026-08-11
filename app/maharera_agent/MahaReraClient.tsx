"use client";

import RoleGuard from "@/components/shared/RoleGuard";

export default function MahaReraClient({ html }: { html: string }) {
  return (
    <RoleGuard allowedRoles={['ADMIN']} agentKey="maharera_agent">
      <main className="min-h-screen bg-[#f4f5f2] pt-20">
        <iframe
          title="MahaRERA Agent"
          srcDoc={html}
          className="block h-[calc(100vh-5rem)] w-full border-0"
        />
      </main>
    </RoleGuard>
  );
}
