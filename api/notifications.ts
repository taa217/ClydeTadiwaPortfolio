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

    const subject = ` ${post.title}`;
    const html = `
      <div style="margin:0;padding:24px;background-color:#f8fafc;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#f1f5f9;">
                    <div style="font-size:14px;letter-spacing:.08em;color:#475569;text-transform:uppercase;">Clyde Tadiwa</div>
                    <h1 style="font-size:24px;line-height:1.3;margin:6px 0 0 0;color:#0f172a;">${post.title}</h1>
                    <div style="font-size:13px;color:#64748b;margin-top:6px;">Published ${new Date(post.publishedAt).toLocaleDateString()}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://clydetadiwa.vercel.app/blog/${post.slug}" style="display:block;">
                      <img src="${post.coverImage}" alt="${post.title}" style="display:block;width:100%;height:auto;border:0;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">${post.excerpt}</p>
                    <div style="text-align:center;margin:24px 0 8px 0;">
                      <a href="https://clydetadiwa.vercel.app/blog/${post.slug}"
                         style="display:inline-block;padding:12px 20px;background-color:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                        Read the full post →
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#64748b;">
                      <a href="https://clydetadiwa.vercel.app" style="color:#0f172a;text-decoration:underline;">Visit the blog</a>
                    </p>
                    <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} Clyde Tadiwa</p>
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
    // Don't throw error - email failures shouldn't prevent post creation
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

    const subject = `I've just launched a new project: ${project.title}`;
    const html = `
      <div style="margin:0;padding:24px;background-color:#f8fafc;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#f1f5f9;">
                    <div style="font-size:14px;letter-spacing:.08em;color:#475569;text-transform:uppercase;">Clyde Tadiwa</div>
                    <h1 style="font-size:24px;line-height:1.3;margin:6px 0 0 0;color:#0f172a;">${project.title}</h1>
                    <div style="font-size:13px;color:#64748b;margin-top:6px;">New project showcase</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://clydetadiwa.vercel.app/projects" style="display:block;">
                      <img src="${project.imageUrl}" alt="${project.title}" style="display:block;width:100%;height:auto;border:0;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">${project.description}</p>
                    <div style="text-align:center;margin:24px 0 8px 0;">
                      <a href="https://clydetadiwa.vercel.app/projects"
                         style="display:inline-block;padding:12px 20px;background-color:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                        View project details →
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#64748b;">
                      <a href="https://clydetadiwa.vercel.app/projects" style="color:#0f172a;text-decoration:underline;">View more projects</a>
                    </p>
                    <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} Clyde Tadiwa</p>
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
    // Don't throw error - email failures shouldn't prevent project creation
  }
} 
