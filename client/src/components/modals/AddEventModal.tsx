import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEventSchema } from "@shared/schema";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertEventSchema.extend({
  // Additional client-side validation
  name: z.string().min(3, "Name must be at least 3 characters"),
  date: z.string().min(3, "Date is required"),
  thumbnailUrl: z.string().url("Please enter a valid URL"),
});

type FormValues = z.infer<typeof formSchema>;

const AddEventModal = ({ isOpen, onClose }: AddEventModalProps) => {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      date: "",
      thumbnailUrl: "",
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (eventData: FormValues) => {
      const res = await apiRequest("POST", "/api/events", eventData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Added",
        description: "The event has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Event",
        description: error.message || "There was an error adding the event.",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    addEventMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-dark-800 border border-dark-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Add New Event</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="event-name" className="text-dark-300">Event Name</Label>
                  <FormControl>
                    <Input
                      {...field}
                      id="event-name"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="event-date" className="text-dark-300">Event Date</Label>
                  <FormControl>
                    <Input
                      {...field}
                      id="event-date"
                      placeholder="e.g. June 15-17, 2023"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="event-thumbnail" className="text-dark-300">Event Thumbnail URL</Label>
                  <FormControl>
                    <Input
                      {...field}
                      id="event-thumbnail"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-white py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                disabled={addEventMutation.isPending}
              >
                {addEventMutation.isPending ? "Adding..." : "Add Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventModal;
