"use client";

import DocumentReader from "../../components/user_input/DocumentReader";
import RoleGuard from "../../components/shared/RoleGuard";

export default function UserInputPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']} agentKey="user_input">
      <DocumentReader />
    </RoleGuard>
  );
}
