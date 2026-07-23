CREATE TABLE "koi_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"buy_price" integer NOT NULL,
	"collectible" boolean DEFAULT false NOT NULL,
	"collect_cost" integer DEFAULT 0 NOT NULL,
	"note" text,
	CONSTRAINT "koi_ingredients_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "koi_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"batch_yield" integer DEFAULT 10 NOT NULL,
	"totem_price" integer NOT NULL,
	"street_price" integer NOT NULL,
	CONSTRAINT "koi_products_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "koi_recipe_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "koi_recipe_items_product_id_ingredient_id_unique" UNIQUE("product_id","ingredient_id")
);
--> statement-breakpoint
ALTER TABLE "koi_recipe_items" ADD CONSTRAINT "koi_recipe_items_product_id_koi_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."koi_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "koi_recipe_items" ADD CONSTRAINT "koi_recipe_items_ingredient_id_koi_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."koi_ingredients"("id") ON DELETE no action ON UPDATE no action;