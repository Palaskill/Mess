-- MEss security migration. Apply with an owner/migration role, in a coordinated
-- deployment with the security/session-authorization branch. Never use a service
-- role key in the browser. See SECURITY_SETUP.md before executing this file.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto' AND n.nspname='extensions') THEN
    RAISE EXCEPTION 'pgcrypto must be available in extensions; inspect extension placement before applying this migration';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS mess_private;
REVOKE ALL ON SCHEMA mess_private FROM PUBLIC;
GRANT USAGE ON SCHEMA mess_private TO anon, authenticated;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS password_hash text;

-- Preserve legacy creator passwords; stop encoding a verifier into a public name.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.assignments a JOIN public.orders o ON o.id=a.order_id JOIN public.participants p ON p.id=a.participant_id WHERE o.session_id<>p.session_id) THEN
   RAISE EXCEPTION 'Existing cross-session assignments require owner review before applying the migration';
 END IF;
END $$;
UPDATE public.sessions SET password_hash=NULL WHERE btrim(password_hash)='';
UPDATE public.sessions SET password_hash=coalesce(password_hash, substring(name FROM '::auth:([a-f0-9]+)$')),
 name=regexp_replace(name, '::auth:[a-f0-9]+$', '') WHERE name ~ '::auth:[a-f0-9]+$';

CREATE TABLE IF NOT EXISTS mess_private.grants (
 token_hash text PRIMARY KEY, session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '12 hours')
);
CREATE INDEX IF NOT EXISTS mess_grants_session ON mess_private.grants(session_id);
CREATE TABLE IF NOT EXISTS mess_private.unlock_limits (
 session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL, attempts integer NOT NULL
);
CREATE TABLE IF NOT EXISTS mess_private.scan_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
 token_hash text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
REVOKE ALL ON ALL TABLES IN SCHEMA mess_private FROM PUBLIC, anon, authenticated;
ALTER TABLE mess_private.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_private.unlock_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_private.scan_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mess_private.valid_grant(sid uuid, token text, require_open boolean DEFAULT true)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT token ~ '^[a-f0-9]{64}$' AND EXISTS (
   SELECT 1 FROM mess_private.grants g JOIN public.sessions s ON s.id=g.session_id
   WHERE g.session_id=sid AND g.token_hash=encode(extensions.digest(token,'sha256'),'hex')
   AND g.expires_at>now() AND (NOT require_open OR s.status='open'));
$$;
CREATE OR REPLACE FUNCTION mess_private.header_token()
RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-mess-session-token','');
$$;
CREATE OR REPLACE FUNCTION mess_private.can_edit(sid uuid, require_open boolean DEFAULT true)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT mess_private.valid_grant(sid,mess_private.header_token(),require_open);
$$;
CREATE OR REPLACE FUNCTION mess_private.menu_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM mess_private.grants g JOIN public.sessions s ON s.id=g.session_id
   WHERE g.token_hash=encode(extensions.digest(mess_private.header_token(),'sha256'),'hex')
   AND g.expires_at>now() AND s.status='open');
$$;
CREATE OR REPLACE FUNCTION public.mess_can_edit(p_session_id uuid,p_token text,p_require_open boolean DEFAULT true)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT mess_private.valid_grant(p_session_id,p_token,p_require_open);
$$;
CREATE OR REPLACE FUNCTION public.mess_revoke_grant(p_session_id uuid,p_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM mess_private.grants WHERE session_id=p_session_id AND token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
$$;

CREATE OR REPLACE FUNCTION public.mess_session(p_session_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',s.id,'name',s.name,'status',s.status,'created_at',s.created_at,
   'has_password',s.password_hash IS NOT NULL) FROM public.sessions s WHERE s.id=p_session_id;
$$;
CREATE OR REPLACE FUNCTION public.mess_sessions()
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',s.id,'name',s.name,'status',s.status,'created_at',s.created_at,
   'has_password',s.password_hash IS NOT NULL,'participant_count',(SELECT count(*) FROM public.participants p WHERE p.session_id=s.id))
 FROM public.sessions s ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.mess_unlock_session(p_session_id uuid,p_password text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE stored text; token text; attempts integer; window_start timestamptz;
BEGIN
 IF p_password IS NULL OR octet_length(p_password)>256 THEN RETURN NULL; END IF;
 -- Serialize attempts per session so concurrent failures cannot evade the limit.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_session_id::text, 9021));
 SELECT s.password_hash INTO stored FROM public.sessions s WHERE s.id=p_session_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT l.attempts,l.window_start INTO attempts,window_start FROM mess_private.unlock_limits l WHERE l.session_id=p_session_id;
 IF window_start>now()-interval '1 minute' AND attempts>=8 THEN RETURN NULL; END IF;
 INSERT INTO mess_private.unlock_limits VALUES(p_session_id,now(),1)
 ON CONFLICT(session_id) DO UPDATE SET attempts=CASE WHEN mess_private.unlock_limits.window_start<=now()-interval '1 minute' THEN 1 ELSE mess_private.unlock_limits.attempts+1 END,
 window_start=CASE WHEN mess_private.unlock_limits.window_start<=now()-interval '1 minute' THEN now() ELSE mess_private.unlock_limits.window_start END;
 IF stored IS NOT NULL THEN
   IF stored ~ '^[a-f0-9]{64}$' THEN
     IF encode(extensions.digest(btrim(p_password),'sha256'),'hex')<>stored THEN RETURN NULL; END IF;
     IF octet_length(btrim(p_password))<=72 THEN
       DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.assignments a JOIN public.orders o ON o.id=a.order_id JOIN public.participants p ON p.id=a.participant_id WHERE o.session_id<>p.session_id) THEN
   RAISE EXCEPTION 'Existing cross-session assignments require owner review before applying the migration';
 END IF;
END $$;
UPDATE public.sessions SET password_hash=extensions.crypt(btrim(p_password),extensions.gen_salt('bf',10)) WHERE id=p_session_id;
     END IF;
   ELSIF extensions.crypt(btrim(p_password),stored) IS DISTINCT FROM stored THEN RETURN NULL;
   END IF;
 END IF;
 DELETE FROM mess_private.unlock_limits WHERE session_id=p_session_id;
 DELETE FROM mess_private.grants WHERE expires_at<=now();
 token=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO mess_private.grants(token_hash,session_id) VALUES(encode(extensions.digest(token,'sha256'),'hex'),p_session_id);
 RETURN token;
END $$;

CREATE OR REPLACE FUNCTION public.mess_create_session(p_name text,p_password text,p_participants jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; token text;
BEGIN
 IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 80
 OR p_password IS NULL OR char_length(btrim(p_password))<8 OR octet_length(btrim(p_password))>72
 OR jsonb_typeof(p_participants) IS DISTINCT FROM 'array' OR jsonb_array_length(p_participants)>30 THEN
   RAISE EXCEPTION 'Invalid session details';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_participants) p
   WHERE char_length(btrim(coalesce(p->>'name',''))) NOT BETWEEN 1 AND 80 OR coalesce(p->>'color','') !~ '^#[a-fA-F0-9]{6}$') THEN
   RAISE EXCEPTION 'Invalid participant';
 END IF;
 INSERT INTO public.sessions(name,status,password_hash) VALUES(btrim(p_name),'open',extensions.crypt(btrim(p_password),extensions.gen_salt('bf',10))) RETURNING id INTO sid;
 INSERT INTO public.participants(session_id,name,color) SELECT sid,btrim(p->>'name'),p->>'color' FROM jsonb_array_elements(p_participants) p;
 token=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO mess_private.grants(token_hash,session_id) VALUES(encode(extensions.digest(token,'sha256'),'hex'),sid);
 RETURN jsonb_build_object('session',public.mess_session(sid),'token',token);
END $$;

-- Reserve quota atomically before any provider work. Shared across all app workers.
CREATE OR REPLACE FUNCTION public.mess_reserve_scan(p_session_id uuid,p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lease uuid;
BEGIN
 IF NOT mess_private.valid_grant(p_session_id,p_token,true) THEN RAISE EXCEPTION 'Session locked'; END IF;
 PERFORM pg_advisory_xact_lock(9021001);
 DELETE FROM mess_private.scan_requests WHERE started_at<now()-interval '2 days';
 IF EXISTS(SELECT 1 FROM mess_private.scan_requests WHERE session_id=p_session_id AND finished_at IS NULL AND started_at>now()-interval '3 minutes') THEN RAISE EXCEPTION 'Scan already running'; END IF;
 IF (SELECT count(*) FROM mess_private.scan_requests WHERE session_id=p_session_id AND started_at>now()-interval '1 hour')>=20
 OR (SELECT count(*) FROM mess_private.scan_requests WHERE started_at>now()-interval '1 day')>=100 THEN RAISE EXCEPTION 'Scan quota reached'; END IF;
 INSERT INTO mess_private.scan_requests(session_id,token_hash) VALUES(p_session_id,encode(extensions.digest(p_token,'sha256'),'hex')) RETURNING id INTO lease;
 RETURN lease;
END $$;
CREATE OR REPLACE FUNCTION public.mess_finish_scan(p_lease uuid,p_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE mess_private.scan_requests SET finished_at=now() WHERE id=p_lease AND token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
$$;

-- Enforce relationship integrity even when the API is called directly.
CREATE OR REPLACE FUNCTION mess_private.assignment_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE osid uuid; psid uuid; ordered integer; kind text; assigned integer;
BEGIN
 SELECT session_id,quantity,split_type INTO osid,ordered,kind FROM public.orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT session_id INTO psid FROM public.participants WHERE id=NEW.participant_id FOR SHARE;
 IF osid IS NULL OR psid IS NULL OR osid<>psid THEN RAISE EXCEPTION 'Order and participant must belong to the same session'; END IF;
 IF NEW.quantity<1 OR NEW.quantity>100 OR (kind='shared' AND NEW.quantity<>1) THEN RAISE EXCEPTION 'Invalid assignment quantity'; END IF;
 IF kind='individual' THEN
  SELECT coalesce(sum(quantity),0) INTO assigned FROM public.assignments WHERE order_id=NEW.order_id AND id IS DISTINCT FROM NEW.id;
  IF assigned+NEW.quantity>ordered THEN RAISE EXCEPTION 'Assigned quantity exceeds the order'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION mess_private.immutable_session()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN RAISE EXCEPTION 'Session cannot be changed'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION mess_private.order_quantity_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.quantity<1 OR (NEW.split_type='individual' AND NEW.quantity<(SELECT coalesce(sum(quantity),0) FROM public.assignments WHERE order_id=NEW.id)) THEN
  RAISE EXCEPTION 'Order quantity cannot be lower than its assignments';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS mess_order_quantity ON public.orders;
CREATE TRIGGER mess_order_quantity BEFORE UPDATE OF quantity ON public.orders FOR EACH ROW EXECUTE FUNCTION mess_private.order_quantity_integrity();
DROP TRIGGER IF EXISTS mess_assignment_integrity ON public.assignments;
CREATE TRIGGER mess_assignment_integrity BEFORE INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION mess_private.assignment_integrity();
DROP TRIGGER IF EXISTS mess_order_session ON public.orders;
CREATE TRIGGER mess_order_session BEFORE UPDATE OF session_id ON public.orders FOR EACH ROW EXECUTE FUNCTION mess_private.immutable_session();
DROP TRIGGER IF EXISTS mess_participant_session ON public.participants;
CREATE TRIGGER mess_participant_session BEFORE UPDATE OF session_id ON public.participants FOR EACH ROW EXECUTE FUNCTION mess_private.immutable_session();

-- Deliberately public reading; password verifiers are NEVER selectable by API roles.
-- Replace all legacy policies so an old permissive OR-policy cannot bypass these.
DO $$ DECLARE p record; t text; BEGIN
 FOREACH t IN ARRAY ARRAY['sessions','participants','orders','assignments','menu_items'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
  EXECUTE format('CREATE POLICY mess_read ON public.%I FOR SELECT TO anon,authenticated USING (true)',t);
 END LOOP;
END $$;
REVOKE ALL ON public.sessions FROM PUBLIC, anon, authenticated;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.sessions'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE SELECT(%I), INSERT(%I), UPDATE(%I), REFERENCES(%I) ON public.sessions FROM PUBLIC,anon,authenticated',c.attname,c.attname,c.attname,c.attname);
 END LOOP;
END $$;
GRANT SELECT(id,name,status,created_at) ON public.sessions TO anon,authenticated;
GRANT UPDATE(status), DELETE ON public.sessions TO anon,authenticated;
CREATE POLICY mess_close ON public.sessions FOR UPDATE TO anon,authenticated USING(mess_private.can_edit(id,true)) WITH CHECK(mess_private.can_edit(id,false) AND status='closed');
CREATE POLICY mess_delete ON public.sessions FOR DELETE TO anon,authenticated USING(mess_private.can_edit(id,false));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.participants,public.orders,public.assignments,public.menu_items TO anon,authenticated;
CREATE POLICY mess_participants_write ON public.participants FOR ALL TO anon,authenticated USING(mess_private.can_edit(session_id)) WITH CHECK(mess_private.can_edit(session_id));
CREATE POLICY mess_orders_write ON public.orders FOR ALL TO anon,authenticated USING(mess_private.can_edit(session_id)) WITH CHECK(mess_private.can_edit(session_id));
CREATE POLICY mess_menu_write ON public.menu_items FOR ALL TO anon,authenticated USING(mess_private.menu_editor()) WITH CHECK(mess_private.menu_editor());
CREATE POLICY mess_assignments_write ON public.assignments FOR ALL TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.orders o JOIN public.participants p ON p.id=participant_id AND p.session_id=o.session_id WHERE o.id=order_id AND mess_private.can_edit(o.session_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.orders o JOIN public.participants p ON p.id=participant_id AND p.session_id=o.session_id WHERE o.id=order_id AND mess_private.can_edit(o.session_id)));

-- Functions default to PUBLIC execution in PostgreSQL: grant only audited entrypoints.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mess_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION mess_private.header_token(),mess_private.can_edit(uuid,boolean),mess_private.menu_editor() TO anon,authenticated;
REVOKE ALL ON FUNCTION public.mess_can_edit(uuid,text,boolean),public.mess_revoke_grant(uuid,text),public.mess_session(uuid),public.mess_sessions(),public.mess_unlock_session(uuid,text),public.mess_create_session(text,text,jsonb),public.mess_reserve_scan(uuid,text),public.mess_finish_scan(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mess_can_edit(uuid,text,boolean),public.mess_revoke_grant(uuid,text),public.mess_session(uuid),public.mess_sessions(),public.mess_unlock_session(uuid,text),public.mess_create_session(text,text,jsonb),public.mess_reserve_scan(uuid,text),public.mess_finish_scan(uuid,text) TO anon,authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
