import {
  Building2,
  Clapperboard,
  Cpu,
  GraduationCap,
  Presentation,
  Sofa,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { ResourceType } from "@/lib/constants";

export const RESOURCE_TYPE_ICONS: Record<ResourceType, LucideIcon> = {
  MEETING_ROOM: Presentation,
  CONFERENCE_ROOM: Building2,
  TRAINING_ROOM: GraduationCap,
  WORKSPACE: Sofa,
  EQUIPMENT: Cpu,
  VEHICLE: Truck,
  OTHER: Clapperboard,
};
