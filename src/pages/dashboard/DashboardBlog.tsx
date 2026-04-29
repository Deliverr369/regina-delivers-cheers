import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Calendar, Loader2, Upload, ExternalLink, FileText } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  published: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);

const toDatetimeLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const empty: Post = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: "",
  author: "Deliverr Team",
  published: false,
  published_at: null,
  meta_title: "",
  meta_description: "",
  keywords: [],
};

const DashboardBlog = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Post | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load posts", description: error.message, variant: "destructive" });
    setPosts((data as Post[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ ...empty });
    setKeywordInput("");
  };

  const openEdit = (p: Post) => {
    setEditing({ ...p, keywords: p.keywords || [] });
    setKeywordInput("");
  };

  const handleUpload = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("store-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("store-images").getPublicUrl(path);
      setEditing({ ...editing, cover_image: data.publicUrl });
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (!editing.content.trim()) {
      toast({ title: "Content required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const slug = editing.slug?.trim() || slugify(editing.title);
      // If publishing & no scheduled time, set to now
      let published_at = editing.published_at;
      if (editing.published && !published_at) published_at = new Date().toISOString();

      const payload = {
        slug,
        title: editing.title.trim(),
        excerpt: editing.excerpt || null,
        content: editing.content,
        cover_image: editing.cover_image || null,
        author: editing.author || "Deliverr Team",
        published: editing.published,
        published_at,
        meta_title: editing.meta_title || null,
        meta_description: editing.meta_description || null,
        keywords: editing.keywords?.length ? editing.keywords : null,
      };

      if (editing.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Post updated" });
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
        toast({ title: "Post created" });
      }
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Post deleted" });
    load();
  };

  const addKeyword = () => {
    const k = keywordInput.trim();
    if (!k || !editing) return;
    setEditing({ ...editing, keywords: [...(editing.keywords || []), k] });
    setKeywordInput("");
  };

  const removeKeyword = (k: string) => {
    if (!editing) return;
    setEditing({ ...editing, keywords: (editing.keywords || []).filter((x) => x !== k) });
  };

  const statusBadge = (p: Post) => {
    if (!p.published) return <Badge variant="secondary">Draft</Badge>;
    if (p.published_at && new Date(p.published_at) > new Date())
      return <Badge className="bg-amber-500 hover:bg-amber-500"><Calendar className="h-3 w-3 mr-1" />Scheduled</Badge>;
    return <Badge className="bg-green-600 hover:bg-green-600">Published</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Blog Posts
          </h1>
          <p className="text-muted-foreground mt-1">
            Write, edit and schedule SEO-optimized blog posts.
          </p>
        </div>
        <Button onClick={openNew} size="lg">
          <Plus className="h-4 w-4 mr-2" /> New Post
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Posts ({posts.length})</CardTitle>
          <CardDescription>Drafts, scheduled and published posts.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No posts yet. Click "New Post" to start.</p>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <div key={p.id} className="flex items-center gap-4 border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                  {p.cover_image ? (
                    <img src={p.cover_image} alt="" className="h-14 w-14 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{p.title}</p>
                      {statusBadge(p)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">/blog/{p.slug}</p>
                    {p.published_at && (
                      <p className="text-xs text-muted-foreground">
                        {p.published && new Date(p.published_at) > new Date() ? "Scheduled for " : "Published "}
                        {new Date(p.published_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-5">
              {/* Title */}
              <div>
                <Label>Title *</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setEditing({
                      ...editing,
                      title,
                      slug: editing.id ? editing.slug : slugify(title),
                    });
                  }}
                  placeholder="Best Liquor Delivery in Regina 2026"
                />
              </div>

              {/* Slug */}
              <div>
                <Label>URL slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/blog/</span>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                    placeholder="auto-generated-from-title"
                  />
                </div>
              </div>

              {/* Cover image */}
              <div>
                <Label>Featured image</Label>
                <div className="flex items-start gap-3 mt-1">
                  {editing.cover_image && (
                    <img src={editing.cover_image} alt="" className="h-24 w-32 rounded object-cover border" />
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editing.cover_image || ""}
                      onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })}
                      placeholder="Image URL or upload below"
                    />
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                        <span>
                          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          Upload image
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <Label>Excerpt</Label>
                <Textarea
                  value={editing.excerpt || ""}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                  placeholder="Short summary shown on the blog index"
                  rows={2}
                />
              </div>

              {/* Content */}
              <div>
                <Label>Content (Markdown)</Label>
                <Textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="# Heading&#10;&#10;Your post content. Supports **bold**, [links](https://...), and - bulleted lists."
                  rows={14}
                  className="font-mono text-sm"
                />
              </div>

              {/* Author */}
              <div>
                <Label>Author</Label>
                <Input
                  value={editing.author || ""}
                  onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                />
              </div>

              {/* SEO */}
              <div className="border-t pt-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">SEO Settings</h3>
                <div>
                  <Label>SEO title <span className="text-xs text-muted-foreground">(under 60 chars)</span></Label>
                  <Input
                    value={editing.meta_title || ""}
                    onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
                    placeholder={editing.title}
                    maxLength={70}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{(editing.meta_title || "").length}/60</p>
                </div>
                <div>
                  <Label>Meta description <span className="text-xs text-muted-foreground">(under 160 chars)</span></Label>
                  <Textarea
                    value={editing.meta_description || ""}
                    onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                    placeholder={editing.excerpt || ""}
                    maxLength={180}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{(editing.meta_description || "").length}/160</p>
                </div>
                <div>
                  <Label>Keywords</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                      placeholder="alcohol delivery regina (press Enter)"
                    />
                    <Button type="button" variant="outline" onClick={addKeyword}>Add</Button>
                  </div>
                  {editing.keywords && editing.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {editing.keywords.map((k) => (
                        <Badge key={k} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(k)}>
                          {k} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Publishing */}
              <div className="border-t pt-5 space-y-4">
                <h3 className="font-semibold">Publishing</h3>
                <div className="flex items-center gap-3">
                  <Switch
                    id="published"
                    checked={editing.published}
                    onCheckedChange={(v) => setEditing({ ...editing, published: v })}
                  />
                  <Label htmlFor="published">Published (otherwise stays as draft)</Label>
                </div>
                <div>
                  <Label>Publish date / Schedule</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(editing.published_at)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        published_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to publish immediately. Set a future date to schedule — post will go live automatically at that time.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardBlog;
