const clientBase = (import.meta as any).env?.VITE_SITE_URL || (import.meta as any).env?.VITE_PUBLIC_SITE_URL || "";

export const site = {
  name: "Clyde Tadiwa",
  domain: clientBase, // e.g. https://clydetadiwa.com
  twitter: "clydetadiwa",
  description:
    "Portfolio, projects, and thoughts on AI, ML, and software engineering by Clyde Tadiwa.",
  defaultImage: "/assets/favicon-ct.svg",
};

export function absoluteUrl(pathname: string): string {
  // Pass-through absolute and data URLs
  if (!pathname) return pathname;
  const lower = pathname.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("//") || lower.startsWith("data:")) {
    return pathname;
  }

  const base = site.domain?.replace(/\/$/, "") || "";
  // If no base domain configured, ensure we at least return a leading-slash path
  if (!base) return pathname.startsWith("/") ? pathname : `/${pathname}`;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function toIso(date: string | Date | undefined): string | undefined {
  if (!date) return undefined;
  try {
    return (typeof date === "string" ? new Date(date) : date).toISOString();
  } catch {
    return undefined;
  }
}

export function buildJsonLdWebsite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.domain || undefined,
  } as const;
}

export function buildJsonLdPerson() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    url: site.domain || undefined,
  } as const;
}

export function buildJsonLdBlogPosting(p: {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description,
    image: p.image ? absoluteUrl(p.image) : undefined,
    author: [{ "@type": "Person", name: p.author || site.name }],
    datePublished: p.datePublished,
    dateModified: p.dateModified || p.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      '@id': absoluteUrl(`/blog/${p.slug}`),
    },
    keywords: p.keywords,
    isAccessibleForFree: true,
    publisher: {
      "@type": "Person",
      name: site.name,
      url: site.domain || undefined,
    },
  } as const;
}



export function buildJsonLdWebPage(p: {
  title: string;
  description?: string;
  url: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.title,
    description: p.description,
    url: absoluteUrl(p.url),
    image: p.image ? absoluteUrl(p.image) : undefined,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: site.name,
      url: site.domain || undefined,
    },
  } as const;
}

export function buildJsonLdBreadcrumb(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  } as const;
}

export function buildJsonLdBlogItemList(posts: { title: string; slug: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: p.title,
      url: absoluteUrl(`/blog/${p.slug}`),
    })),
  } as const;
}

export function buildJsonLdProjectsItemList(projects: { title: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: projects.map((p, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: p.title,
      url: p.url ? p.url : absoluteUrl('/projects'),
    })),
  } as const;
}

export function buildJsonLdProject(p: {
  name: string;
  description?: string;
  image?: string;
  url?: string;
  codeRepository?: string;
  programmingLanguage?: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.name,
    description: p.description,
    image: p.image ? absoluteUrl(p.image) : undefined,
    url: p.url,
    keywords: p.keywords,
    creator: {
      "@type": "Person",
      name: site.name,
      url: site.domain || undefined,
    },
    ...(p.codeRepository
      ? {
          sameAs: [p.codeRepository],
          programmingLanguage: p.programmingLanguage,
        }
      : {}),
  } as const;
}
