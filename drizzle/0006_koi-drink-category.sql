-- Sensible default so the planner's food/drink split is meaningful out of the
-- box; each dish's type stays editable from the dashboard afterwards.
UPDATE koi_products SET category = 'drink' WHERE name = 'Leite de Banana';
