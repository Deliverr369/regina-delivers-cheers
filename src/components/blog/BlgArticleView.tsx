import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

export interface BlgArticle {
  id: number;
  slug: string;
  title: string;
  meta_description: string | null;
  hero_image_url: string | null;
  language_code: string | null;
  content_html: string | null;
  json_ld: any;
  faq_json_ld: any;
  article_created_at: string | null;
  article_updated_at: string | null;
}

// Repoint article-specific URLs in stored schema to the live post URL; leave author/publisher alone.
const repoint = (data: any, url: string): any => {
  if (!data || typeof data !== "object") return data;
  const fix = (node: any): any => {
    if (Array.isArray(node)) return node.map(fix);
    if (!node || typeof node !== "object") return node;
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = k === "author" || k === "publisher" ? v : fix(v);
    }
    const types = ([] as string[]).concat(out["@type"] || []);
    if (types.some((t) => /Article|BlogPosting|NewsArticle/.test(t))) {
      out.url = url;
      if (out.mainEntityOfPage && typeof out.mainEntityOfPage === "object") {
        out.mainEntityOfPage = { ...out.mainEntityOfPage, "@id": url, ...(out.mainEntityOfPage.url ? { url } : {}) };
      } else out.mainEntityOfPage = url;
    }
    if (types.includes("BreadcrumbList") && Array.isArray(out.itemListElement) && out.itemListElement.length) {
      const items = [...out.itemListElement];
      const last = { ...items[items.length - 1] };
      if (last.item && typeof last.item === "object") last.item = { ...last.item, "@id": url };
      else last.item = url;
      items[items.length - 1] = last;
      out.itemListElement = items;
    }
    return out;
  };
  return fix(data);
};

const BlgArticleView = ({ article }: { article: BlgArticle }) => {
  const url = `https://deliverr.ca/blog/${article.slug}`;

  useEffect(() => {
    const prev = document.documentElement.lang;
    if (article.language_code) document.documentElement.lang = article.language_code;
    const ogType = document.head.querySelector('meta[property="og:type"]');
    const t = setTimeout(() => ogType?.setAttribute("content", "article"), 0);
    const scripts: HTMLScriptElement[] = [];
    [article.json_ld, article.faq_json_ld].forEach((block) => {
      if (!block) return;
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.text = JSON.stringify(repoint(block, url)).replace(/</g, "\\u003c");
      document.head.appendChild(s);
      scripts.push(s);
    });
    return () => {
      clearTimeout(t);
      document.documentElement.lang = prev;
      scripts.forEach((s) => s.remove());
    };
  }, [article, url]);

  return (
    <>
      <SEO
        title={article.title}
        description={article.meta_description || undefined}
        canonical={url}
        image={article.hero_image_url || undefined}
      />
      <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>
      <article
        lang={article.language_code || undefined}
        className="blg-content prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: article.content_html || "" }}
      />
    </>
  );
};

export default BlgArticleView;
