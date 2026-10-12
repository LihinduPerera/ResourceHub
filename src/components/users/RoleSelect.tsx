"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiPatch, getErrorMessage } from "@/lib/api/client";
import type { UserRole } from "@/lib/constants";
import { USER_ROLES, USER_ROLE_META } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const router = useRouter();

  async function changeRole(value: string) {
    try {
      await apiPatch(`/api/users/${userId}`, { role: value as UserRole });
      toast.success(
        `Role changed to ${USER_ROLE_META[value as UserRole].label}.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to change the role."));
    }
  }

  return (
    <Select value={role} onValueChange={changeRole} disabled={disabled}>
      <SelectTrigger className="w-32" aria-label="Change role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {USER_ROLES.map((item) => (
          <SelectItem key={item} value={item}>
            {USER_ROLE_META[item].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
