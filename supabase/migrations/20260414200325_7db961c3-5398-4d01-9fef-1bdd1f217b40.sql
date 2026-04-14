-- Organization roles enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

-- Organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization members table
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Helper: check org role
CREATE OR REPLACE FUNCTION public.get_org_role(_user_id UUID, _org_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;

-- RLS: organizations
CREATE POLICY "Members can view own organizations"
ON public.organizations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = organizations.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update organization"
ON public.organizations FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete organization"
ON public.organizations FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- RLS: organization_members
CREATE POLICY "Members can view org members"
ON public.organization_members FOR SELECT TO authenticated
USING (
  public.is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Org owners and admins can add members"
ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  OR (
    -- Allow the org creator to add themselves as owner
    user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Org owners can remove members"
ON public.organization_members FOR DELETE TO authenticated
USING (
  public.get_org_role(auth.uid(), organization_id) = 'owner'
  OR user_id = auth.uid() -- members can leave
);

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();