import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertRiderSchema, Event } from "@shared/schema";
import { useState, useEffect } from "react";

interface AddRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertRiderSchema.extend({
  // Additional client-side validation
  name: z.string().min(3, "Name must be at least 3 characters"),
  eventId: z.coerce.number().min(1, "Event is required"),
  price: z.coerce.number().min(1, "Price must be at least $1"),
  thumbnailUrl: z.string().url("Please enter a valid URL"),
  videoUrl: z.string().url("Please enter a valid URL"),
});

type FormValues = z.infer<typeof formSchema>;

const AddRiderModal = ({ isOpen, onClose }: AddRiderModalProps) => {
  const { toast } = useToast();
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isAutoGeneratingThumbnail, setIsAutoGeneratingThumbnail] = useState(false);
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: isOpen,
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      eventId: 0,
      price: 80,
      thumbnailUrl: "",
      videoUrl: "",
    },
  });
  
  // Watch form values for auto thumbnail generation
  const videoUrl = form.watch("videoUrl");
  const thumbnailUrl = form.watch("thumbnailUrl");
  
  // Update thumbnail preview when URL changes
  useEffect(() => {
    if (thumbnailUrl) {
      setThumbnailPreview(thumbnailUrl);
    } else {
      setThumbnailPreview(null);
    }
  }, [thumbnailUrl]);
  
  // Auto-generate thumbnail URL from video URL
  const generateThumbnailFromVideo = () => {
    if (!videoUrl) {
      toast({
        title: "No Video URL",
        description: "Please enter a video URL first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAutoGeneratingThumbnail(true);
    
    try {
      let thumbnailUrl = "";
      
      // YouTube
      if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
        const videoId = videoUrl.includes("youtu.be/") 
          ? videoUrl.split("youtu.be/")[1].split("?")[0]
          : videoUrl.includes("v=")
            ? videoUrl.split("v=")[1].split("&")[0]
            : "";
        
        if (videoId) {
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
      // Vimeo
      else if (videoUrl.includes("vimeo.com")) {
        // For Vimeo we can't easily get the thumbnail without an API call,
        // so we'll suggest a placeholder
        thumbnailUrl = "https://i.vimeocdn.com/video/default.jpg";
      }
      // Dropbox
      else if (videoUrl.includes("dropbox.com")) {
        // For Dropbox, we can suggest a placeholder
        thumbnailUrl = "https://www.dropbox.com/static/images/logo_catalog/blue_dropbox_glyph_2015.svg";
      }
      
      if (thumbnailUrl) {
        form.setValue("thumbnailUrl", thumbnailUrl);
        setThumbnailPreview(thumbnailUrl);
        toast({
          title: "Thumbnail Generated",
          description: "A thumbnail URL has been automatically generated.",
        });
      } else {
        toast({
          title: "Could Not Generate Thumbnail",
          description: "Unable to generate a thumbnail for this video URL.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Thumbnail Generation Failed",
        description: "An error occurred while trying to generate the thumbnail.",
        variant: "destructive",
      });
    }
    
    setIsAutoGeneratingThumbnail(false);
  };

  const addRiderMutation = useMutation({
    mutationFn: async (riderData: FormValues) => {
      const res = await apiRequest("POST", "/api/riders", riderData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rider Added",
        description: "The rider has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Rider",
        description: error.message || "There was an error adding the rider.",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    addRiderMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-dark-800 border border-dark-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Add New Rider</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="rider-name" className="text-dark-300">Rider Name</Label>
                  <FormControl>
                    <Input
                      {...field}
                      id="rider-name"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="rider-event" className="text-dark-300">Event</Label>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <SelectValue placeholder="Select Event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-dark-800 border border-dark-600 text-white">
                      <SelectItem value="0" disabled>Select Event</SelectItem>
                      {events?.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
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
              name="price"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="rider-price" className="text-dark-300">Price ($)</Label>
                  <FormControl>
                    <Input
                      {...field}
                      id="rider-price"
                      type="number"
                      min="1"
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
                  <div className="flex justify-between items-center">
                    <Label htmlFor="thumbnail-url" className="text-dark-300">Thumbnail URL</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateThumbnailFromVideo}
                      disabled={isAutoGeneratingThumbnail || !videoUrl}
                      className="text-xs bg-primary-800 text-white hover:bg-primary-700"
                    >
                      {isAutoGeneratingThumbnail ? "Generating..." : "Auto-Generate"}
                    </Button>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      id="thumbnail-url"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </FormControl>
                  {thumbnailPreview && (
                    <div className="mt-2 p-2 bg-dark-700 rounded-md">
                      <p className="text-dark-300 text-xs mb-1">Thumbnail Preview:</p>
                      <div className="relative w-full pb-[56.25%] overflow-hidden rounded-md">
                        <img 
                          src={thumbnailPreview}
                          alt="Thumbnail preview" 
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/600x400/222/aaa?text=Preview+Not+Available";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="video-url" className="text-dark-300">Video URL</Label>
                  <FormControl>
                    <Input
                      {...field}
                      id="video-url"
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
                disabled={addRiderMutation.isPending}
              >
                {addRiderMutation.isPending ? "Adding..." : "Add Rider"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRiderModal;
