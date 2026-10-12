"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiPatch, apiPost, getErrorMessage } from "@/lib/api/client";
import { createResourceSchema } from "@/lib/validations";
import { RESOURCE_TYPES, RESOURCE_TYPE_META } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import type { ResourceCardData } from "./ResourceCard";

type ResourceFormValues = z.infer<typeof createResourceSchema>;

const EMPTY_VALUES: ResourceFormValues = {
  name: "",
  type: "MEETING_ROOM",
  location: "",
  capacity: 10,
  description: "",
};

export function ResourceFormDialog({
  resource,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  resource?: ResourceCardData;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = openProp ?? internalOpen;
  const setOpen = (value: boolean) =>
    onOpenChange ? onOpenChange(value) : setInternalOpen(value);

  const isEdit = Boolean(resource);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: EMPTY_VALUES,
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: resource?.name ?? "",
      type: resource?.type ?? "MEETING_ROOM",
      location: resource?.location ?? "",
      capacity: resource?.capacity ?? 10,
      description: resource?.description ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource]);

  async function onSubmit(values: ResourceFormValues) {
    try {
      if (isEdit && resource) {
        await apiPatch(`/api/resources/${resource.id}`, values);
        toast.success("Resource updated.");
      } else {
        await apiPost("/api/resources", values);
        toast.success("Resource created and now available to book.");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save the resource."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit resource" : "Add resource"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the resource details below."
              : "Make a new space or piece of equipment available for booking."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="resource-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Boardroom A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RESOURCE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {RESOURCE_TYPE_META[type].label}
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
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="10"
                        {...field}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 3rd floor, Building A"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this resource…"
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
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="resource-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
