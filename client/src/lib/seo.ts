const clientBase = (import.meta as any).env?.VITE_SITE_URL || (import.meta as any).env?.VITE_PUBLIC_SITE_URL || "";

export const site = {
  name: "Clyde Tadiwa",
  domain: clientBase, // e.g. https://clydetadiwa.com
  twitter: "clydetadiwa",
  description:
    "Portfolio, projects, and thoughts on AI, ML, and software engineering by Clyde Tadiwa.",
  defaultImage: "/assets/ai.png",
};

export function absoluteUrl(pathname: string): string {
  const base = site.domain?.replace(/\/$/, "") || "";
  if (!base) return pathname; // fallback to relative if domain not set
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
  } as const;
}


