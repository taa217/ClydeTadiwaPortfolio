import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import Navigation from "@/components/navigation";
import Home from "@/pages/home";
import Projects from "@/pages/projects";
import BlogIndex from "@/pages/blog/index";
import BlogPost from "@/pages/blog/[slug]";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminPostEditor from "@/pages/admin/post-editor";
import NotFound from "@/pages/not-found";
import Footer from "@/components/footer";
import ProtectedRoute from '@/components/protected-route';
import AdminProjectEditor from "@/pages/admin/project-editor";
import React from 'react'; 
import Layout from "@/components/layout";

function Router() {
  const [location] = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    //<Layout>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-20">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/projects" component={Projects} />
            <Route path="/blog" component={BlogIndex} />
            <Route path="/blog/:slug" component={BlogPost} />
            <Route path="/admin" component={AdminLogin} />
            <Route path="/admin/dashboard">
              {() => (
                <ProtectedRoute redirectTo="/admin">
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/admin/posts/new">
              {() => (
                <ProtectedRoute redirectTo="/admin">
                  <AdminPostEditor />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/admin/posts/:id/edit">
              {() => (
                <ProtectedRoute redirectTo="/admin">
                  <AdminPostEditor />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/admin/projects/new">
              {() => (
                <ProtectedRoute redirectTo="/admin">
                  <AdminProjectEditor />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/admin/projects/:id/edit">
              {() => (
                <ProtectedRoute redirectTo="/admin">
                  <AdminProjectEditor />
                </ProtectedRoute>
              )}
            </Route>
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
        <Toaster />
      </div>
   // </Layout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;