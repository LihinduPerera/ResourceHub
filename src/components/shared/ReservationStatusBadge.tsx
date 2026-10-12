import { Badge } from "@/components/ui/badge";
import {
  RESERVATION_STATUS_META,
  type ReservationStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ReservationStatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  const meta = RESERVATION_STATUS_META[status];

  return (
    <Badge variant="outline" className={cn(meta.badge, "border", className)}>
      {meta.label}
    </Badge>
  );
}
