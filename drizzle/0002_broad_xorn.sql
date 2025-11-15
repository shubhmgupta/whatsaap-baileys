ALTER TABLE "plans" ADD COLUMN "discount_percentage" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "discount_label" text;