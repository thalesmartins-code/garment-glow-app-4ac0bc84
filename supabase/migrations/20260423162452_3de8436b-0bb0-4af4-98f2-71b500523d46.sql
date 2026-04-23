-- Tabela de permissões personalizadas por membro (usado para role 'viewer')
CREATE TABLE IF NOT EXISTS public.member_route_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  route text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (organization_id, user_id, route)
);

ALTER TABLE public.member_route_permissions ENABLE ROW LEVEL SECURITY;

-- Owners/admins podem ver tudo da org
CREATE POLICY "Org admins can view route permissions"
ON public.member_route_permissions FOR SELECT TO authenticated
USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role]));

-- Membros podem ver as próprias permissões
CREATE POLICY "Members can view own route permissions"
ON public.member_route_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() AND is_org_member(auth.uid(), organization_id));

-- Owners/admins podem inserir
CREATE POLICY "Org admins can insert route permissions"
ON public.member_route_permissions FOR INSERT TO authenticated
WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role]));

-- Owners/admins podem deletar
CREATE POLICY "Org admins can delete route permissions"
ON public.member_route_permissions FOR DELETE TO authenticated
USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role]));

CREATE INDEX IF NOT EXISTS idx_member_route_permissions_lookup
  ON public.member_route_permissions (organization_id, user_id);

-- Função helper para checagens server-side
CREATE OR REPLACE FUNCTION public.can_member_access_route(_user_id uuid, _org_id uuid, _route text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_route_permissions
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND route = _route
  )
$$;