-- Read-only checks: safe to run any time. They change nothing.
-- 1. Every rule and which action it covers
SELECT   tablename,
         policyname,
         cmd
FROM     pg_policies
WHERE    schemaname = 'public'
ORDER BY tablename, cmd;

-- 2. Is security on, and how many rules does each table have
SELECT   t.tablename,
         t.rowsecurity AS rls_on,
         count(p.policyname) AS policies
FROM     pg_tables AS t
         LEFT OUTER JOIN
         pg_policies AS p
         ON p.schemaname = t.schemaname
            AND p.tablename = t.tablename
WHERE    t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;