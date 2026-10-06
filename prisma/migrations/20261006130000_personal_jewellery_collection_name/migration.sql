-- The "personalized" collection shared its title, "עיצוב אישי", with the
-- custom-design page (/custom) - two different things under one name in the
-- menu and the collections band (critique 2026-10-06; D4D.14). It holds
-- pieces made with a name, an initial or a photograph, so it becomes
-- "תכשיטים אישיים". Only the unedited seed name is replaced: a title the owner
-- has already changed is theirs.
UPDATE "Collection"
SET "nameHe" = 'תכשיטים אישיים', "updatedAt" = NOW()
WHERE "slug" = 'personalized' AND "nameHe" = 'עיצוב אישי';
