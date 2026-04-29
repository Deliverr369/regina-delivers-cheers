import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author: string | null;
  published_at: string | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_image, author, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setPosts(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Blog | Regina Delivery News & Guides | Deliverr"
        description="Tips, guides, and news about same-day delivery in Regina. Best stores, store hours, deals and more."
        canonical="https://regina-delivers-cheers.lovable.app/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Deliverr Blog",
          url: "https://regina-delivers-cheers.lovable.app/blog",
        }}
      />
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 font-heading">Deliverr Blog</h1>
        <p className="text-muted-foreground mb-10 text-lg">
          Guides, news and tips for delivery in Regina, SK.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet — check back soon!</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`}>
                <Card className="h-full hover:border-primary transition-colors overflow-hidden">
                  {p.cover_image && (
                    <img src={p.cover_image} alt={p.title} className="w-full h-48 object-cover" loading="lazy" />
                  )}
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-2 font-heading">{p.title}</h2>
                    {p.excerpt && <p className="text-muted-foreground text-sm mb-3">{p.excerpt}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {p.published_at ? new Date(p.published_at).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : ""}
                      {p.author && <span>· {p.author}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
