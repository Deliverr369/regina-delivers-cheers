import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, Calendar, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
}

// Minimal markdown renderer (headings, bold, links, lists, paragraphs).
const renderMarkdown = (md: string) => {
  const lines = md.split("\n");
  const out: JSX.Element[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc pl-6 my-4 space-y-1">
          {listBuf.map((li, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inline(li)) }} />
          ))}
        </ul>
      );
      listBuf = [];
    }
  };

  const safeUrl = (u: string) => (/^(https?:|mailto:|\/)/i.test(u.trim()) ? u : "#");
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.+?)\]\((.+?)\)/g, (_m, t, u) => `<a href="${safeUrl(u)}" class="text-primary underline">${t}</a>`);

  lines.forEach((line, i) => {
    if (line.startsWith("# ")) {
      flushList();
      out.push(<h1 key={i} className="text-4xl font-bold mt-8 mb-4 font-heading">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(<h2 key={i} className="text-2xl font-bold mt-8 mb-3 font-heading">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flushList();
      out.push(<h3 key={i} className="text-xl font-bold mt-6 mb-2 font-heading">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      listBuf.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(<p key={i} className="my-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inline(line)) }} />);
    }
  });
  flushList();
  return out;
};

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState<{ slug: string; title: string; excerpt: string | null }[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else setPost(data as Post);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    supabase
      .from("blog_posts")
      .select("slug,title,excerpt,keywords")
      .eq("published", true)
      .neq("slug", post.slug)
      .then(({ data }) => {
        const mine = new Set((post.keywords || []).join(" ").toLowerCase().split(/\s+/));
        const scored = (data || []).map((r) => ({
          ...r,
          score: (r.keywords || []).join(" ").toLowerCase().split(/\s+/).filter((w) => w.length > 3 && mine.has(w)).length,
        }));
        scored.sort((a, b) => b.score - a.score);
        setRelated(scored.slice(0, 3));
      });
  }, [post]);

  if (notFound) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      {post && (
        <SEO
          title={post.meta_title || post.title}
          description={post.meta_description || post.excerpt || undefined}
          canonical={`https://deliverr.ca/blog/${post.slug}`}
          image={post.cover_image || undefined}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.meta_description || post.excerpt,
            image: post.cover_image,
            author: { "@type": "Organization", name: post.author || "Deliverr" },
            publisher: { "@type": "Organization", name: "Deliverr" },
            datePublished: post.published_at,
            keywords: post.keywords?.join(", "),
            mainEntityOfPage: `https://deliverr.ca/blog/${post.slug}`,
          }}
        />
      )}
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/blog"><ArrowLeft className="h-4 w-4 mr-2" /> All posts</Link>
        </Button>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : post ? (
          <article>
            {post.cover_image && (
              <img src={post.cover_image} alt={post.title} className="w-full rounded-lg mb-6 object-cover max-h-96" />
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
              <Calendar className="h-4 w-4" />
              {post.published_at && new Date(post.published_at).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
              {post.author && <span>· {post.author}</span>}
            </div>
            <div className="prose prose-lg max-w-none">{renderMarkdown(post.content)}</div>

            <section className="mt-10 rounded-xl border bg-primary/5 p-6 text-center">
              <h2 className="text-xl font-bold mb-2">Ready to order in Regina?</h2>
              <p className="text-muted-foreground mb-4">Delivered daily 8 AM – midnight. Free delivery on orders over $50.</p>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/stores"><ShoppingBag className="h-5 w-5 mr-2" /> Order now</Link>
              </Button>
            </section>

            {related.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-bold mb-4">Related Regina delivery guides</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {related.map((r) => (
                    <Link key={r.slug} to={`/blog/${r.slug}`} className="block rounded-lg border p-4 hover:border-primary transition-colors">
                      <p className="font-semibold leading-snug">{r.title}</p>
                      {r.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.excerpt}</p>}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
