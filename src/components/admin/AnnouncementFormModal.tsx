"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Select, DateField } from "@/components/ui/Select";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { createAnnouncementAction, updateAnnouncementAction } from "@/app/admin/actions";
import { announcementSchema } from "@/lib/validations/announcement";
import { ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_STATUSES } from "@/lib/constants";
import { today } from "@/lib/format";
import type { Announcement } from "@/types/announcement";

type Values = z.infer<typeof announcementSchema>;
type FormValues = z.input<typeof announcementSchema>;

export function AnnouncementFormModal({
  announcement,
  onClose,
}: {
  announcement: Announcement | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      description: "",
      body: "",
      priority: "normal",
      status: "published",
      publishedAt: today(),
      expiresAt: "",
    },
  });

  if (announcement && seededFor !== announcement.id) {
    setSeededFor(announcement.id);
    reset({
      title: announcement.title,
      description: announcement.description,
      body: announcement.body,
      priority: announcement.priority,
      status: announcement.status,
      publishedAt: announcement.publishedAt.slice(0, 10),
      expiresAt: announcement.expiresAt ? announcement.expiresAt.slice(0, 10) : "",
    });
  }
  if (!announcement && seededFor !== null) setSeededFor(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = announcement
      ? await updateAnnouncementAction(announcement.id, values)
      : await createAnnouncementAction(values);

    if (result.success) {
      toast(result.message, "success");
      onClose();
      router.refresh();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) setError(field as keyof FormValues, { message: messages[0] });
      }
    }
    setServerError(result.message);
    toast(result.message, "error");
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={announcement ? "Edit Announcement" : "New Announcement"}
      description={
        announcement
          ? `Update "${announcement.title}".`
          : "Publish a company-wide notice for all employees."
      }
      size="lg"
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="announcement-form" isLoading={isSubmitting} loadingText="Saving…">
            {announcement ? "Save Changes" : "Create Announcement"}
          </Button>
        </FormActions>
      }
    >
      <form id="announcement-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormErrorMessage message={serverError} />

        <FormField label="Title" htmlFor="ann-title" error={errors.title?.message} required>
          <Input
            id="ann-title"
            placeholder="e.g. Office closed for maintenance on Saturday"
            error={errors.title?.message}
            {...register("title")}
          />
        </FormField>

        <FormField
          label="Short Description"
          htmlFor="ann-description"
          error={errors.description?.message}
          hint="One or two lines shown on the notice card."
          required
        >
          <Textarea
            id="ann-description"
            rows={2}
            placeholder="A brief summary employees see in the list."
            error={errors.description?.message}
            {...register("description")}
          />
        </FormField>

        <FormField label="Full Announcement" htmlFor="ann-body" error={errors.body?.message} required>
          <Textarea
            id="ann-body"
            rows={7}
            placeholder="Write the complete announcement here."
            error={errors.body?.message}
            {...register("body")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Priority" htmlFor="ann-priority" error={errors.priority?.message} required>
            <Select
              id="ann-priority"
              options={ANNOUNCEMENT_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
              error={errors.priority?.message}
              {...register("priority")}
            />
          </FormField>

          <FormField label="Status" htmlFor="ann-status" error={errors.status?.message} required>
            <Select
              id="ann-status"
              options={ANNOUNCEMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              error={errors.status?.message}
              {...register("status")}
            />
          </FormField>

          <FormField label="Publish Date" htmlFor="ann-published" error={errors.publishedAt?.message} required>
            <DateField id="ann-published" error={errors.publishedAt?.message} {...register("publishedAt")} />
          </FormField>

          <FormField
            label="Expires On"
            htmlFor="ann-expires"
            error={errors.expiresAt?.message}
            hint="Leave empty to keep it open-ended."
          >
            <DateField id="ann-expires" error={errors.expiresAt?.message} {...register("expiresAt")} />
          </FormField>
        </div>

        <SubmitButton className="sr-only" loadingText="Saving…">
          Save
        </SubmitButton>
      </form>
    </Modal>
  );
}
