-- KOI catalog defaults, captured in-game on 2026-07-23. Prices are editable
-- from the dashboard; ON CONFLICT DO NOTHING keeps later edits untouched.

INSERT INTO koi_ingredients (name, buy_price, collectible, collect_cost, note) VALUES
  ('Sal', 10, false, 0, NULL),
  ('Óleo', 35, false, 0, NULL),
  ('Farinha de Trigo', 45, false, 0, NULL),
  ('Açúcar', 10, false, 0, NULL),
  ('Mel', 28, false, 0, NULL),
  ('Garrafão de Água', 700, false, 0, NULL),
  ('Ovo', 8, false, 0, NULL),
  ('Tomate', 12, true, 0, NULL),
  ('Cebola', 12, true, 0, NULL),
  ('Batata', 36, true, 0, NULL),
  ('Alface', 40, true, 0, NULL),
  ('Cenoura', 12, true, 0, NULL),
  ('Abóbora', 12, true, 0, NULL),
  ('Banana', 70, true, 0, NULL),
  ('Morango', 105, true, 0, NULL),
  ('Leite', 140, true, 10, 'Coleta exige 1 garrafa vazia (R$ 10) por unidade'),
  ('Carne', 400, true, 0, 'Coletável caçando'),
  ('Tilápia', 400, true, 0, 'Coletável pescando')
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
INSERT INTO koi_products (name, batch_yield, totem_price, street_price) VALUES
  ('Vegan Kimchi', 10, 500, 500),
  ('Koi Roll', 10, 600, 600),
  ('Sundubu Kuiu', 10, 800, 800),
  ('Leite de Banana', 10, 450, 450),
  ('Caos Cream', 10, 350, 350)
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
INSERT INTO koi_recipe_items (product_id, ingredient_id, quantity)
SELECT p.id, i.id, v.quantity
FROM (VALUES
  ('Vegan Kimchi', 'Cenoura', 10),
  ('Vegan Kimchi', 'Tomate', 10),
  ('Vegan Kimchi', 'Cebola', 10),
  ('Vegan Kimchi', 'Batata', 10),
  ('Vegan Kimchi', 'Alface', 10),
  ('Vegan Kimchi', 'Sal', 1),
  ('Koi Roll', 'Ovo', 10),
  ('Koi Roll', 'Tomate', 10),
  ('Koi Roll', 'Tilápia', 10),
  ('Koi Roll', 'Cebola', 10),
  ('Koi Roll', 'Alface', 10),
  ('Koi Roll', 'Sal', 1),
  ('Koi Roll', 'Farinha de Trigo', 1),
  ('Koi Roll', 'Óleo', 1),
  ('Sundubu Kuiu', 'Abóbora', 10),
  ('Sundubu Kuiu', 'Tomate', 10),
  ('Sundubu Kuiu', 'Carne', 10),
  ('Sundubu Kuiu', 'Cebola', 10),
  ('Sundubu Kuiu', 'Cenoura', 10),
  ('Sundubu Kuiu', 'Garrafão de Água', 1),
  ('Sundubu Kuiu', 'Sal', 1),
  ('Sundubu Kuiu', 'Óleo', 1),
  ('Leite de Banana', 'Banana', 10),
  ('Leite de Banana', 'Leite', 10),
  ('Leite de Banana', 'Açúcar', 1),
  ('Leite de Banana', 'Garrafão de Água', 1),
  ('Caos Cream', 'Morango', 10),
  ('Caos Cream', 'Leite', 10),
  ('Caos Cream', 'Ovo', 10),
  ('Caos Cream', 'Mel', 1)
) AS v(product, ingredient, quantity)
JOIN koi_products p ON p.name = v.product
JOIN koi_ingredients i ON i.name = v.ingredient
ON CONFLICT (product_id, ingredient_id) DO NOTHING;
