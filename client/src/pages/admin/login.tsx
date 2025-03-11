import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { loginSchema, type LoginCredentials } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  async function onSubmit(data: LoginCredentials) {
    try {
      await apiRequest("POST", "/api/admin/login", data);
      toast({
        title: "Success",
        description: "Logged in successfully"
      });
      navigate("/admin/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid credentials",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Sign in to manage your blog posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
