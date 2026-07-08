import { SITE_URL } from "@/content/decisions";

/** Plain builder functions returning schema.org JSON-LD objects — no
 * component/rendering concerns here, just data shaping. Pass the result to
 * <JsonLd data={...} /> (src/components/seo/json-ld.tsx). */

interface BreadcrumbItem {
  name: string;
  path: string; // relative, e.g. "/books/some-slug"
}

export function breadcrumbSchema(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Narriva",
    url: SITE_URL,
    description: "A selective book publishing house for African authors.",
  };
}

export function webSiteSchema(brand: "narriva" | "kekere") {
  return brand === "narriva"
    ? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Narriva",
        url: SITE_URL,
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Kekere Stories",
        url: `${SITE_URL}/kekere`,
      };
}

interface BookSchemaInput {
  slug: string;
  title: string;
  hookLine: string;
  synopsis: string;
  price: number;
  genre: string;
  publishedAt: Date;
  author: { name: string; slug: string | null };
}

export function bookSchema(book: BookSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    description: book.synopsis || book.hookLine,
    genre: book.genre,
    datePublished: book.publishedAt.toISOString(),
    url: `${SITE_URL}/books/${book.slug}`,
    author: {
      "@type": "Person",
      name: book.author.name,
      ...(book.author.slug ? { url: `${SITE_URL}/authors/${book.author.slug}` } : {}),
    },
    offers: {
      "@type": "Offer",
      price: book.price,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/books/${book.slug}`,
    },
  };
}

interface PersonSchemaInput {
  slug: string;
  name: string;
  bio: string | null;
  shortBio: string | null;
}

export function personSchema(author: PersonSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    description: author.bio || author.shortBio || undefined,
    url: `${SITE_URL}/authors/${author.slug}`,
  };
}

interface ArticleSchemaInput {
  slug: string;
  title: string;
  excerpt: string;
  authorName: string;
  publishedAt: Date;
  updatedAt: Date;
}

export function articleSchema(post: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    url: `${SITE_URL}/blog/${post.slug}`,
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Narriva",
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };
}

interface CreativeWorkSchemaInput {
  id: string;
  title: string;
  hookLine: string;
  genre: string;
  wordCount: number;
  publishedAt: Date | null;
  author: { name: string; slug: string | null };
}

export function creativeWorkSchema(story: CreativeWorkSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: story.title,
    description: story.hookLine,
    genre: story.genre,
    wordCount: story.wordCount,
    inLanguage: "en",
    url: `${SITE_URL}/kekere/story/${story.id}`,
    ...(story.publishedAt ? { datePublished: story.publishedAt.toISOString() } : {}),
    author: {
      "@type": "Person",
      name: story.author.name,
      ...(story.author.slug ? { url: `${SITE_URL}/authors/${story.author.slug}` } : {}),
    },
    // Every story costs cowries to read in full beyond the truncated
    // preview — never claim free access to a crawler regardless of any
    // individual visitor's per-account free-read allowance.
    isAccessibleForFree: false,
  };
}

interface FaqItem {
  question: string;
  answer: string;
}

export function faqPageSchema(categories: readonly { faqs: readonly FaqItem[] }[]) {
  const items = categories.flatMap((c) => c.faqs);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
