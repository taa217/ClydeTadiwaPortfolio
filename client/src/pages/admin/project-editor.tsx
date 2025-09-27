import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { insertProjectSchema, type InsertProject, type Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProjectEditor() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch project data if editing
  const { data: project } = useQuery<Project>({
    queryKey: isEditing ? [`/api/projects/${id}`] : ["/api/projects"],
    enabled: isEditing,
  });

  // Initialize form with project data or empty values
  const form = useForm<InsertProject & { technologiesInput: string }>({
    resolver: zodResolver(insertProjectSchema.extend({
      technologiesInput: insertProjectSchema.shape.technologies.element.transform(String)
    })),
    defaultValues: {
      title: project?.title || "",
      description: project?.description || "",
      imageUrl: project?.imageUrl || "",
      technologies: project?.technologies || [],
      technologiesInput: project?.technologies ? project.technologies.join(', ') : "",
      liveUrl: project?.liveUrl || "",
      githubUrl: project?.githubUrl || "",
    }
  });

  useEffect(() => {
    if (isEditing && project) {
      form.reset({
        title: project.title,
        description: project.description,
        imageUrl: project.imageUrl,
        technologies: project.technologies ?? [],
        technologiesInput: (project.technologies ?? []).join(', '),
        liveUrl: project.liveUrl || "",
        githubUrl: project.githubUrl || "",
      });
    }
  }, [isEditing, project, form]);

  async function onSubmit(formData: InsertProject & { technologiesInput: string }) {
    setIsSubmitting(true);
    try {
      // Create a copy of the data to submit
      const projectData: InsertProject = {
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl,
        liveUrl: formData.liveUrl,
        githubUrl: formData.githubUrl,
        // Convert comma-separated string to array of strings
        technologies: formData.technologiesInput
          .split(',')
          .map(tech => tech.trim())
          .filter(Boolean)
      };

      if (isEditing) {
        await apiRequest("PATCH", `/api/projects/${id}`, projectData);
      } else {
        await apiRequest("POST", "/api/projects", projectData);
      }

      // Invalidate projects query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Success",
        description: `Project ${isEditing ? "updated" : "created"} successfully`
      });

      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} project`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="py-12">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold mb-8">
            {isEditing ? "Edit Project" : "New Project"}
          </h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Project Title" />
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
                      <Textarea {...field} placeholder="Describe your project" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/image.jpg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technologiesInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technologies</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="React, Node.js, TypeScript" />
                    </FormControl>
                    <FormDescription>
                      Enter technologies as comma-separated values
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="liveUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Live URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://yourproject.com" />
                    </FormControl>
                    <FormDescription>
                      Optional: URL where the project is deployed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="githubUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://github.com/username/repo" />
                    </FormControl>
                    <FormDescription>
                      Optional: URL to the GitHub repository
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/admin/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{isEditing ? "Update" : "Create"} Project</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}