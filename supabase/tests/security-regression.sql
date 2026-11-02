-- LOCAL / DISPOSABLE database only. Apply the bootstrap schema and security
-- migration first. Run with psql -v ON_ERROR_STOP=1 -f this-file. All fixtures
-- roll back; do not run against the production project.
BEGIN;
CREATE TEMP TABLE mess_test_context(a jsonb,b jsonb,pa uuid,pb uuid,oa uuid);
INSERT INTO mess_test_context(a,b) VALUES(
 public.mess_create_session('Fixture A','dummy-pass-A','[{"name":"Dummy A","color":"#3B82F6"}]'),
 public.mess_create_session('Fixture B','dummy-pass-B','[{"name":"Dummy B","color":"#10B981"}]'));
UPDATE mess_test_context c SET pa=(SELECT id FROM public.participants WHERE session_id=(c.a->'session'->>'id')::uuid),
 pb=(SELECT id FROM public.participants WHERE session_id=(c.b->'session'->>'id')::uuid);
WITH o AS (INSERT INTO public.orders(session_id,item_name,unit_price,quantity,split_type)
 SELECT (a->'session'->>'id')::uuid,'Fixture pizza',20,2,'individual' FROM mess_test_context RETURNING id)
UPDATE mess_test_context SET oa=(SELECT id FROM o);
GRANT SELECT ON mess_test_context TO anon;
SET LOCAL ROLE anon;
SELECT set_config('request.headers','{}',true);
DO $$ DECLARE denied boolean:=false; BEGIN
 BEGIN PERFORM password_hash FROM public.sessions LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: anon can select password_hash'; END IF;
 IF EXISTS(SELECT 1 FROM public.mess_sessions() s WHERE s ? 'password_hash' OR s ? 'token') THEN RAISE EXCEPTION 'FAIL: sensitive public DTO'; END IF;
 denied:=false;
 BEGIN INSERT INTO public.orders(session_id,item_name,unit_price) SELECT (a->'session'->>'id')::uuid,'Denied',1 FROM mess_test_context;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: unauthenticated order insert'; END IF;
END $$;
SELECT set_config('request.headers',jsonb_build_object('x-mess-session-token',a->>'token')::text,true) FROM mess_test_context;
DO $$ DECLARE c record; denied boolean:=false; BEGIN
 SELECT * INTO c FROM mess_test_context;
 IF NOT public.mess_can_edit((c.a->'session'->>'id')::uuid,c.a->>'token',true) THEN RAISE EXCEPTION 'FAIL: valid grant rejected'; END IF;
 IF public.mess_can_edit((c.b->'session'->>'id')::uuid,c.a->>'token',true) THEN RAISE EXCEPTION 'FAIL: grant crosses sessions'; END IF;
 BEGIN INSERT INTO public.assignments(order_id,participant_id,quantity) VALUES(c.oa,c.pb,1);
 EXCEPTION WHEN insufficient_privilege OR raise_exception OR check_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: cross-session assignment accepted'; END IF;
 INSERT INTO public.assignments(order_id,participant_id,quantity) VALUES(c.oa,c.pa,1);
 denied:=false;
 BEGIN UPDATE public.participants SET session_id=(c.b->'session'->>'id')::uuid WHERE id=c.pa;
 EXCEPTION WHEN insufficient_privilege OR raise_exception OR check_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: participant moved across sessions'; END IF;
 UPDATE public.sessions SET status='closed' WHERE id=(c.a->'session'->>'id')::uuid;
 IF public.mess_can_edit((c.a->'session'->>'id')::uuid,c.a->>'token',true) THEN RAISE EXCEPTION 'FAIL: closed session remains editable'; END IF;
 denied:=false;
 BEGIN INSERT INTO public.orders(session_id,item_name,unit_price) VALUES((c.a->'session'->>'id')::uuid,'Denied closed',1);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: closed-session insert accepted'; END IF;
END $$;
SELECT set_config('request.headers',jsonb_build_object('x-mess-session-token',b->>'token')::text,true) FROM mess_test_context;
DO $$ DECLARE c record; lease uuid; denied boolean:=false; BEGIN
 SELECT * INTO c FROM mess_test_context;
 lease:=public.mess_reserve_scan((c.b->'session'->>'id')::uuid,c.b->>'token');
 BEGIN PERFORM public.mess_reserve_scan((c.b->'session'->>'id')::uuid,c.b->>'token');
 EXCEPTION WHEN raise_exception THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: parallel scan accepted'; END IF;
 PERFORM public.mess_finish_scan(lease,c.b->>'token');
 PERFORM public.mess_revoke_grant((c.b->'session'->>'id')::uuid,c.b->>'token');
 IF public.mess_can_edit((c.b->'session'->>'id')::uuid,c.b->>'token',false) THEN RAISE EXCEPTION 'FAIL: revoked grant accepted'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
