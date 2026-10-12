import Link from "next/link";
import { CalendarPlus, MapPin, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ResourceType } from "@/lib/constants";
import { RESOURCE_TYPE_META } from "@/lib/constants";
import { RESOURCE_TYPE_ICONS } from "./resource-icons";
import { ResourceActions } from "./ResourceActions";

export type ResourceCardData = {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  capacity: number;
  description: string | null;
  isActive: boolean;
};

export function ResourceCard({
  resource,
  isAdmin,
}: {
  resource: ResourceCardData;
  isAdmin: boolean;
}) {
  const Icon = RESOURCE_TYPE_ICONS[resource.type];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-base leading-tight">
                {resource.name}
              </CardTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="font-medium">
                  {RESOURCE_TYPE_META[resource.type].label}
                </Badge>
                <Badge variant={resource.isActive ? "default" : "secondary"}>
                  {resource.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
          {isAdmin ? (
            <ResourceActions resource={resource} isAdmin={isAdmin} />
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {resource.description || "No description provided."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {resource.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
            Up to {resource.capacity}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className={!resource.isActive ? "pointer-events-none opacity-50" : ""}
        >
          <Link href={`/reservations/new?resource=${resource.id}`}>
            <CalendarPlus />
            Book
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
