import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { insertBlogPostSchema, type InsertBlogPost, type BlogPost } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function PostEditor() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: post } = useQuery<BlogPost>({
    queryKey: ["/api/posts", id],
    enabled: isEditing,
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: post?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[200px] focus:outline-none"
      }
    }
  });

  const form = useForm<InsertBlogPost>({
    resolver: zodResolver(insertBlogPostSchema),
    defaultValues: {
      title: post?.title || "",
      slug: post?.slug || "",
      excerpt: post?.excerpt || "",
      coverImage: post?.coverImage || "",
      tags: post?.tags || [],
      isDraft: post?.isDraft || false, // Changed default to false
      publishedAt: post?.publishedAt || new Date().toISOString(),
      content: post?.content || ""
    }
  });

  async function onSubmit(data: InsertBlogPost) {
    setIsSubmitting(true);
    try {
      data.content = editor?.getHTML() || "";

      if (isEditing) {
        await apiRequest("PATCH", `/api/posts/${id}`, data);
      } else {
        await apiRequest("POST", "/api/posts", data);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });

      toast({
        title: "Success",
        description: `Post ${isEditing ? "updated" : "created"} successfully`
      });
      navigate("/admin/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} post`,
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
            {isEditing ? "Edit Post" : "New Post"}
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Content</FormLabel>
                <EditorContent editor={editor} className="mt-2 border rounded-md p-4" />
              </div>

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
                    <>{isEditing ? "Update" : "Create"} Post</>
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