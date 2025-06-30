import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Loader2, LogOut } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient, removeToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BlogPost, Project } from "@shared/schema";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: posts, isLoading: isLoadingPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/posts"],
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
      removeToken();
      toast({
        title: "Success",
        description: "Logged out successfully"
      });
      navigate("/admin");
    } catch (error) {
      // Even if the API call fails, remove the token and redirect
      removeToken();
      navigate("/admin");
    }
  };

  const handleDeletePost = async (id: number) => {
    setIsDeleting(id);
    try {
      await apiRequest("DELETE", `/api/posts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteProject = async (id: number) => {
    setIsDeleting(id);
    try {
      await apiRequest("DELETE", `/api/projects/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const PostSkeleton = () => (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-6 w-[250px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-[60px]" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </CardContent>
    </Card>
  );

  const ProjectSkeleton = () => (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Blog Posts</h2>
        <Button onClick={() => navigate("/admin/posts/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      <div className="space-y-4">
        {isLoadingPosts ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts?.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No blog posts yet. Create your first post!
            </CardContent>
          </Card>
        ) : (
          posts?.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <time dateTime={post.publishedAt}>
                      {format(new Date(post.publishedAt), "MMMM d, yyyy")}
                    </time>
                    •
                    <span>{post.isDraft ? "Draft" : "Published"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/admin/posts/${post.id}/edit`)}
                    disabled={isDeleting === post.id}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeletePost(post.id)}
                    disabled={isDeleting === post.id}
                  >
                    {isDeleting === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-between items-center mt-16 mb-8">
        <h2 className="text-2xl font-bold">Projects</h2>
        <Button onClick={() => navigate("/admin/projects/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="space-y-4">
        {isLoadingProjects ? (
          <>
            <ProjectSkeleton />
            <ProjectSkeleton />
            <ProjectSkeleton />
          </>
        ) : projects?.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No projects yet. Create your first project!
            </CardContent>
          </Card>
        ) : (
          projects?.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{project.title}</h2>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/admin/projects/${project.id}/edit`)}
                    disabled={isDeleting === project.id}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteProject(project.id)}
                    disabled={isDeleting === project.id}
                  >
                    {isDeleting === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
