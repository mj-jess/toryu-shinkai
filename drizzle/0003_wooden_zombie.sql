CREATE TABLE "koi_sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"unit_cost" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "koi_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sold_at" text NOT NULL,
	"sold_by" text NOT NULL,
	"sold_by_id" text NOT NULL,
	"revenue" integer NOT NULL,
	"cost" integer NOT NULL,
	"created_at" text DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "koi_sale_items" ADD CONSTRAINT "koi_sale_items_sale_id_koi_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."koi_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "koi_sale_items" ADD CONSTRAINT "koi_sale_items_product_id_koi_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."koi_products"("id") ON DELETE no action ON UPDATE no action;