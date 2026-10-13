"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  apiGet,
  apiPost,
  ApiClientError,
  getErrorMessage,
} from "@/lib/api/client";
import { reservationFormSchema } from "@/lib/validations";
import type { AvailabilityDTO } from "@/lib/types";
import { BOOKING_RULES, BOOKING_RULE_MESSAGES } from "@/lib/constants";
import {
  formatDateTime,
  formatTime,
  fromLocalInputValue,
  toLocalInputValue,
} from "@/lib/utils/date";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResourceOption = {
  id: string;
  name: string;
  type: string;
  location: string;
};

type ReservationFormValues = z.infer<typeof reservationFormSchema>;

export function ReservationForm({
  initialResourceId,
  initialResource,
  preselectInvalid = false,
}: {
  initialResourceId?: string;
  initialResource?: ResourceOption;
  preselectInvalid?: boolean;
}) {
  const router = useRouter();
  // Seed with the preselected option so the select renders it before the
  // async list resolves (avoids a sync setState-in-effect).
  const [resources, setResources] = useState<ResourceOption[]>(() =>
    initialResource ? [initialResource] : [],
  );
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [availabilityResult, setAvailabilityResult] = useState<{
    key: string;
    value: AvailabilityDTO | null;
  } | null>(null);
  const [overlapError, setOverlapError] = useState<{
    message: string;
    suggestions: string[];
    durationMs: number;
  } | null>(null);

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      resourceId: initialResourceId ?? "",
      title: "",
      notes: "",
      startTime: "",
      endTime: "",
    },
  });

  const resourceId = useWatch({ control: form.control, name: "resourceId" });
  const startTime = useWatch({ control: form.control, name: "startTime" });
  const endTime = useWatch({ control: form.control, name: "endTime" });

  useEffect(() => {
    apiGet<ResourceOption[]>("/api/resources?pageSize=100")
      .then((rows) => {
        setResources((prev) => {
          const merged = Array.isArray(rows) ? [...rows] : [];
          // Guarantee the preselected option exists even if the list is
          // paged, still loading, or the fetch otherwise omits it.
          if (
            initialResource &&
            !merged.some((r) => r.id === initialResource.id)
          ) {
            merged.push(initialResource);
          }
          // Keep any previously known fallback (e.g. when rows omit it).
          for (const item of prev) {
            if (!merged.some((r) => r.id === item.id)) merged.push(item);
          }
          return merged;
        });
      })
      .catch(() => {
        // Fall back to just the preselected resource so the select still works.
        setResources((prev) => {
          if (
            initialResource &&
            !prev.some((r) => r.id === initialResource.id)
          ) {
            return [...prev, initialResource];
          }
          return prev;
        });
      })
      .finally(() => setResourcesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the preselected id into the form. `defaultValues` only applies on
  // mount, so client-side navigation (Book A -> Book B) needs this to update
  // the selection. Never clobber a user's manual pick: only apply when the
  // field is empty or still holds the previous preselect.
  useEffect(() => {
    if (!initialResourceId) return;
    const current = form.getValues("resourceId");
    if (!current) {
      form.setValue("resourceId", initialResourceId, { shouldValidate: true });
    }
  }, [initialResourceId, form]);

  // Reset the resource selection if the preselected resource vanished.
  useEffect(() => {
    if (
      !resourcesLoading &&
      resourceId &&
      !resources.some((r) => r.id === resourceId)
    ) {
      form.setValue("resourceId", "");
    }
  }, [resources, resourcesLoading, resourceId, form]);

  const selectedResource = useMemo(
    () => resources.find((resource) => resource.id === resourceId),
    [resources, resourceId],
  );

  const durationMs = useMemo(() => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (
      !startTime ||
      !endTime ||
      end.getTime() <= start.getTime() ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return null;
    }
    return end.getTime() - start.getTime();
  }, [startTime, endTime]);

  const durationProblem = useMemo(() => {
    if (durationMs === null) return null;
    if (durationMs < BOOKING_RULES.minDurationMinutes * 60_000) {
      return BOOKING_RULE_MESSAGES.tooShort;
    }
    if (durationMs > BOOKING_RULES.maxDurationMinutes * 60_000) {
      return BOOKING_RULE_MESSAGES.tooLong;
    }
    return null;
  }, [durationMs]);

  // Live availability check, debounced. The effect only updates state from
  // async callbacks (never synchronously), and "checking" is derived by
  // comparing the last completed key with the current query key.
  const availabilityKey = useMemo(() => {
    if (!resourceId || !startTime || !endTime) return null;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    return `${resourceId}|${startTime}|${endTime}`;
  }, [resourceId, startTime, endTime]);

  useEffect(() => {
    if (!availabilityKey) return;

    let cancelled = false;
    const handle = setTimeout(() => {
      const query = new URLSearchParams({
        from: fromLocalInputValue(startTime),
        to: fromLocalInputValue(endTime),
      });

      apiGet<AvailabilityDTO>(
        `/api/resources/${resourceId}/availability?${query.toString()}`,
      )
        .then((value) => {
          if (!cancelled) {
            setAvailabilityResult({ key: availabilityKey, value });
            setOverlapError(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAvailabilityResult({ key: availabilityKey, value: null });
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // `resourceId`, `startTime`, and `endTime` are captured intentionally; the
    // effect is keyed by the derived `availabilityKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityKey]);

  const availability =
    availabilityResult && availabilityResult.key === availabilityKey
      ? availabilityResult.value
      : null;
  const checking =
    availabilityKey !== null && availabilityResult?.key !== availabilityKey;

  async function onSubmit(values: ReservationFormValues) {
    setOverlapError(null);

    try {
      const reservation = await apiPost<{ id: string }>("/api/reservations", {
        resourceId: values.resourceId,
        title: values.title,
        notes: values.notes || null,
        startTime: fromLocalInputValue(values.startTime),
        endTime: fromLocalInputValue(values.endTime),
      });

      toast.success("Reservation request submitted.");
      router.push(`/reservations/${reservation.id}`);
      router.refresh();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "OVERLAP" &&
        error.details
      ) {
        const suggestions = (error.details as { suggestions?: string[] })
          .suggestions;
        setOverlapError({
          message: error.message,
          suggestions: suggestions ?? [],
          durationMs: durationMs ?? 0,
        });
        return;
      }
      toast.error(getErrorMessage(error, "Unable to create the reservation."));
    }
  }

  function applySuggestion(suggestion: string) {
    const end = new Date(
      new Date(suggestion).getTime() + (overlapError?.durationMs ?? 0),
    );
    form.setValue("startTime", toLocalInputValue(suggestion), {
      shouldValidate: true,
    });
    form.setValue("endTime", toLocalInputValue(end.toISOString()), {
      shouldValidate: true,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Reservation details</CardTitle>
          <CardDescription>
            Choose a resource and the window you need. Available slots are
            checked live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              id="reservation-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <FormField
                control={form.control}
                name="resourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={
                            resourcesLoading && resources.length === 0
                          }
                        >
                          <SelectValue
                            placeholder={
                              resourcesLoading
                                ? "Loading resources…"
                                : resources.length === 0
                                  ? "No resources available"
                                  : "Select a resource"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            {resource.name} · {resource.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedResource ? (
                      <FormDescription>
                        {selectedResource.name} · {selectedResource.location}
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Weekly team sync" {...field} />
                    </FormControl>
                    <FormDescription>
                      A short label so others recognise the reservation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional — agenda, setup needs, attendees…"
                        rows={3}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {preselectInvalid ? (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertDescription>
                    The linked resource is unavailable — please pick another.
                  </AlertDescription>
                </Alert>
              ) : null}

              {durationProblem ? (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertDescription>{durationProblem}</AlertDescription>
                </Alert>
              ) : null}

              {overlapError ? (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>Time conflict</AlertTitle>
                  <AlertDescription>
                    {overlapError.message}
                    {overlapError.suggestions.length > 0 ? (
                      <span className="mt-2 block space-y-1.5">
                        <span className="block text-xs font-medium tracking-wide uppercase">
                          Suggested alternatives
                        </span>
                        {overlapError.suggestions.map((suggestion) => (
                          <Button
                            key={suggestion}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mr-1.5"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            {formatDateTime(suggestion)}
                          </Button>
                        ))}
                      </span>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}

              {availability?.available && !durationProblem ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                  <CheckCircle2 />
                  <AlertTitle>Slot is free</AlertTitle>
                  <AlertDescription>
                    No conflicting reservations were found for this window.
                  </AlertDescription>
                </Alert>
              ) : null}

              {availability && !availability.available ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                  <TriangleAlert />
                  <AlertTitle>Slot overlaps another reservation</AlertTitle>
                  <AlertDescription>
                    <span className="block">
                      Conflicts with {availability.conflicts.length} reservation
                      {availability.conflicts.length === 1 ? "" : "s"}:
                    </span>
                    <span className="mt-1 block space-y-0.5 text-xs">
                      {availability.conflicts.map((conflict) => (
                        <span key={conflict.startTime} className="block">
                          {formatDateTime(conflict.startTime)} –{" "}
                          {formatTime(conflict.endTime)}
                        </span>
                      ))}
                    </span>
                    {availability.suggestions.length > 0 ? (
                      <span className="mt-2 block space-y-1.5">
                        <span className="block text-xs font-medium tracking-wide uppercase">
                          Suggested alternatives
                        </span>
                        {availability.suggestions.map((suggestion) => (
                          <Button
                            key={suggestion}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mr-1.5"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            {formatDateTime(suggestion)}
                          </Button>
                        ))}
                      </span>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0 text-primary" />
              Minimum {BOOKING_RULES.minDurationMinutes} minutes
            </p>
            <p className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0 text-primary" />
              Maximum {BOOKING_RULES.maxDurationMinutes / 60} hours
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
              Up to {BOOKING_RULES.maxDaysInAdvance} days ahead
            </p>
            <p className="pt-1 text-xs">
              Requests start as{" "}
              <strong className="font-medium text-foreground">Pending</strong>{" "}
              and hold the slot until an administrator confirms or rejects them.
            </p>
          </CardContent>
        </Card>

        <Button
          type="submit"
          form="reservation-form"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarClock />
          )}
          {checking ? "Checking availability…" : "Submit request"}
        </Button>
      </div>
    </div>
  );
}
