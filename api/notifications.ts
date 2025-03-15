import { storage } from "./storage";
import { sendEmail } from "./email"; // Import the email sending function

export async function notifyNewBlogPost(postId: number) {
  try {
    const post = await storage.getPost(postId);
    if (!post) {
      console.error(`Post with ID ${postId} not found.`);
      return;
    }

    const subscribers = await storage.getSubscribers();
    const subject = `New Blog Post: ${post.title}`;
    const html = `
      <h1>New Blog Post: ${post.title}</h1>
      <p>${post.excerpt}</p>
      <a href="https://yourwebsite.com/blog/${post.slug}">Read More</a>
    `;

    // Send email to each subscriber
    await Promise.all(subscribers.map(subscriber =>
      sendEmail({ to: subscriber.email, subject, html })
    ));

    console.log(`Successfully notified subscribers about new blog post: ${post.title}`);

  } catch (error) {
    console.error("Error notifying subscribers about new blog post:", error);
  }
}

export async function notifyNewProject(projectId: number) {
  try {
    const project = await storage.getProject(projectId);
    if (!project) {
      console.error(`Project with ID ${projectId} not found.`);
      return;
    }

    const subscribers = await storage.getSubscribers();
    const subject = `New Project: ${project.title}`;
    const html = `
      <h1>New Project: ${project.title}</h1>
      <p>${project.description}</p>
      <a href="https://yourwebsite.com/projects/${projectId}">View Project</a>
    `;

    // Send email to each subscriber
    await Promise.all(subscribers.map(subscriber =>
      sendEmail({ to: subscriber.email, subject, html })
    ));

    console.log(`Successfully notified subscribers about new project: ${project.title}`);

  } catch (error) {
    console.error("Error notifying subscribers about new project:", error);
  }
} 