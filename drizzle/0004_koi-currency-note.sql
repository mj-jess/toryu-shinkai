-- The in-game currency is written "$", not "R$" — fix the seeded note.
UPDATE koi_ingredients
SET note = 'Coleta exige 1 garrafa vazia ($ 10) por unidade'
WHERE note = 'Coleta exige 1 garrafa vazia (R$ 10) por unidade';
