import { storage } from "./storage.js";
import { sendBatchEmails } from "./email.js"; // Import the batch email sending function

export async function notifyNewBlogPost(postId: number) {
  try {
    console.log(`Starting notification process for blog post ID: ${postId}`);
    
    const post = await storage.getPost(postId);
    if (!post) {
      console.error(`Post with ID ${postId} not found.`);
      return;
    }

    console.log(`Found post: ${post.title}`);
    
    const subscribers = await storage.getSubscribers();
    console.log(`Found ${subscribers.length} subscribers to notify`);
    
    if (subscribers.length === 0) {
      console.log('No subscribers found, skipping email notifications');
      return;
    }

    const subject = `✨ New Blog Post Alert: ${post.title} is Now Live!`;
    const html = `
      <div style="font-family: 'Roboto', 'Arial', sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f8f8f8;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 30px 0; text-align: center;">
                    <h1 style="font-size: 28px; margin-bottom: 20px; color: #007bff;">${post.title}</h1>
                    <p style="font-size: 16px; color: #777;">Published on ${new Date(post.publishedAt).toLocaleDateString()}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://clydetadiwa.vercel.app/blog/${post.slug}" style="display: block;">
                      <img src="${post.coverImage}" alt="${post.title}" style="width: 100%; border-radius: 8px; margin-bottom: 20px; display: block;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                      ${post.excerpt}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <a href="https://clydetadiwa.vercel.app/blog/${post.slug}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Read the Full Post &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 30px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 14px;">
                    <p style="margin-bottom: 10px;">Stay updated with the latest insights. <a href="https://clydetadiwa.vercel.app" style="color: #007bff; text-decoration: none;">Visit Our Blog</a></p>
                    <p style="margin-bottom: 0;">&copy; ${new Date().getFullYear()} Clyde Tadiwa. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    // Prepare emails for batch sending
    const emails = subscribers.map(subscriber => ({
      to: subscriber.email,
      subject,
      html
    }));

    console.log(`Prepared ${emails.length} emails for batch sending`);

    // Send emails in batches to improve reliability
    await sendBatchEmails(emails);

    console.log(`Successfully notified subscribers about new blog post: ${post.title}`);

  } catch (error) {
    console.error("Error notifying subscribers about new blog post:", error);
    throw error; // Re-throw to ensure the error is visible in Vercel logs
  }
}

export async function notifyNewProject(projectId: number) {
  try {
    console.log(`Starting notification process for project ID: ${projectId}`);
    
    const project = await storage.getProject(projectId);
    if (!project) {
      console.error(`Project with ID ${projectId} not found.`);
      return;
    }

    console.log(`Found project: ${project.title}`);
    
    const subscribers = await storage.getSubscribers();
    console.log(`Found ${subscribers.length} subscribers to notify`);
    
    if (subscribers.length === 0) {
      console.log('No subscribers found, skipping email notifications');
      return;
    }

    const subject = `🚀 New Project Showcase: ${project.title} is Live!`;
    const html = `
      <div style="font-family: 'Roboto', 'Arial', sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f8f8f8;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 30px 0; text-align: center;">
                    <h1 style="font-size: 28px; margin-bottom: 20px; color: #007bff;">${project.title}</h1>
                    <p style="font-size: 16px; color: #777;">Explore our latest creation!</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://clydetadiwa.vercel.app/projects" style="display: block;">
                      <img src="${project.imageUrl}" alt="${project.title}" style="width: 100%; border-radius: 8px; margin-bottom: 20px; display: block;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 20px;">
                      ${project.description}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <a href="https://clydetadiwa.vercel.app/projects" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      View Project Details &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 30px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 14px;">
                    <p style="margin-bottom: 10px;">Discover more exciting projects. <a href="https://clydetadiwa.vercel.app/projects" style="color: #007bff; text-decoration: none;">See Our Portfolio</a></p>
                    <p style="margin-bottom: 0;">&copy; ${new Date().getFullYear()} Clyde Tadiwa. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    // Prepare emails for batch sending
    const emails = subscribers.map(subscriber => ({
      to: subscriber.email,
      subject,
      html
    }));

    console.log(`Prepared ${emails.length} emails for batch sending`);

    // Send emails in batches to improve reliability
    await sendBatchEmails(emails);

    console.log(`Successfully notified subscribers about new project: ${project.title}`);

  } catch (error) {
    console.error("Error notifying subscribers about new project:", error);
    throw error; // Re-throw to ensure the error is visible in Vercel logs
  }
} 
