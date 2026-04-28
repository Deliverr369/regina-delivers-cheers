-- Drop existing role-mutation policies (scoped to public) and recreate them
-- scoped to authenticated only, with explicit self-grant prevention.

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- SELECT: users see their own; admins see all
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT: only admins, and they cannot grant a role to themselves
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id <> auth.uid()
);

-- UPDATE: only admins, and they cannot modify their own role row
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id <> auth.uid()
);

-- DELETE: only admins, and they cannot delete their own role row
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id <> auth.uid()
);