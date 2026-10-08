-- The shop's diamond standard (owner, 2026-10-08; D4D.31):
--   clarity IF to VS1, every stone;
--   round stones Triple Very Good to Triple Excellent (cut, polish, symmetry);
--   fancy shapes VG/VG to EX/EX (polish and symmetry - a fancy shape has no
--   cut grade).
UPDATE "DiamondSpec"
   SET "clarity" = 'IF-VS1',
       "cut" = CASE
                 WHEN lower(coalesce("shape", 'round')) = 'round' THEN 'Triple VG – Triple EX'
                 ELSE 'VG/VG – EX/EX'
               END,
       "updatedAt" = NOW();
