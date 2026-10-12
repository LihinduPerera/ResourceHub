"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, getErrorMessage } from "@/lib/api/client";
import { reservationFormSchema } from "@/lib/validations";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type EditValues = z.infer<typeof reservationFormSchema>;

export function ReservationEditDialog({
  open,
  onOpenChange,
  reservation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    resourceId: string;
    title: string;
    notes: string | null;
    startTime: string;
    endTime: string;
  };
}) {
  const router = useRouter();
  const [resources, setResources] = useState<
    { id: string; name: string; location: string }[]
  >([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);

  const form = useForm<EditValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      resourceId: "",
      title: "",
      notes: "",
      startTime: "",
      endTime: "",
    },
  });

  useEffect(() => {
    if (open) {
      apiGet<{ id: string; name: string; location: string }[]>(
        "/api/resources?pageSize=100",
      )
        .then(setResources)
        .catch(() => setResources([]))
        .finally(() => setResourcesLoading(false));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    form.reset({
      resourceId: reservation.resourceId,
      title: reservation.title,
      notes: reservation.notes ?? "",
      startTime: toLocalInputValue(reservation.startTime),
      endTime: toLocalInputValue(reservation.endTime),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation]);

  async function onSubmit(values: EditValues) {
    try {
      await apiPatch(`/api/reservations/${reservation.id}`, {
        resourceId: values.resourceId,
        title: values.title,
        notes: values.notes || null,
        startTime: fromLocalInputValue(values.startTime),
        endTime: fromLocalInputValue(values.endTime),
      });

      toast.success(
        "Reservation updated. It may need re-approval if the schedule changed.",
      );
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update the reservation."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit reservation</DialogTitle>
          <DialogDescription>
            Update the details below. A confirmed booking that changes its
            schedule returns to pending for re-approval.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="edit-reservation-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="resourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger disabled={resourcesLoading}>
                        <SelectValue placeholder="Select a resource" />
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
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
                      rows={3}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>Optional.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-reservation-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
