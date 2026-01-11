import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateMaintenanceRequest } from "@/hooks/useMaintenanceRequests";

const requestSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Please provide more details (at least 10 characters)").max(1000, "Description must be less than 1000 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface MaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  propertyId: string;
}

export function MaintenanceRequestDialog({
  open,
  onOpenChange,
  tenantId,
  propertyId,
}: MaintenanceRequestDialogProps) {
  const createRequest = useCreateMaintenanceRequest();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        priority: "medium",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: RequestFormValues) => {
    try {
      await createRequest.mutateAsync({
        tenant_id: tenantId,
        property_id: propertyId,
        title: values.title,
        description: values.description,
        priority: values.priority,
      });
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Maintenance Request</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Leaking faucet in bathroom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low - Can wait</SelectItem>
                      <SelectItem value="medium">Medium - Soon</SelectItem>
                      <SelectItem value="high">High - Important</SelectItem>
                      <SelectItem value="urgent">Urgent - Emergency</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Please describe the issue in detail..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
