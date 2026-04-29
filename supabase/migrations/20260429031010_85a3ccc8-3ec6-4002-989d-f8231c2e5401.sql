DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;

CREATE POLICY "Published posts are viewable by everyone"
ON public.blog_posts FOR SELECT
USING (
  (published = true AND (published_at IS NULL OR published_at <= now()))
  OR public.has_role(auth.uid(), 'admin')
);