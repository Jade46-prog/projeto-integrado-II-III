-- Capacidade é opcional; valores já cadastrados são preservados.
ALTER TABLE room ALTER COLUMN capacity DROP NOT NULL;

WITH standard_rooms AS (
    SELECT (floor_number * 100 + room_number)::text AS name,
           floor_number::text || 'º andar' AS floor
    FROM generate_series(1, 4) AS floor_number
    CROSS JOIN generate_series(1, 19) AS room_number
    UNION ALL
    SELECT 'Lab' || lab_number, 'Laboratórios'
    FROM generate_series(1, 6) AS lab_number
)
INSERT INTO room (id, name, floor, capacity)
SELECT gen_random_uuid(), s.name, s.floor, NULL
FROM standard_rooms s
WHERE NOT EXISTS (
    SELECT 1 FROM room r
    WHERE lower(regexp_replace(r.name, '\s+', '', 'g')) = lower(s.name)
)
ON CONFLICT (name) DO NOTHING;
