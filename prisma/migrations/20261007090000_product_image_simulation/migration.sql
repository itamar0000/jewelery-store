-- A product image can be a simulation - a piece shown worn, generated from its
-- own photograph - and is then labelled "הדמיה" wherever it is shown
-- (docs/DECISIONS.md D4D.21). Every existing image is a photograph or a
-- render of the piece itself, so the default is false and no row changes.
ALTER TABLE "ProductImage" ADD COLUMN "isSimulation" BOOLEAN NOT NULL DEFAULT false;
