-- SDR CRM Schema for Supabase
-- Run this in your Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "owner_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "funnel_stages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "color" text,
  "required_fields" text[] DEFAULT '{}' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "custom_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "field_type" text DEFAULT 'text' NOT NULL,
  "options" text[],
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "company" text,
  "role" text,
  "source" text,
  "notes" text,
  "stage" text DEFAULT 'base' NOT NULL,
  "assignee_id" text,
  "custom_field_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "context" text NOT NULL,
  "prompt_instructions" text NOT NULL,
  "trigger_stage" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "generated_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "campaign_id" uuid NOT NULL,
  "content" text NOT NULL,
  "status" text DEFAULT 'generated' NOT NULL,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "lead_name" text NOT NULL,
  "workspace_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
