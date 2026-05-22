import { createClient } from '@supabase/supabase-js';

/**
 * ====================================================================
 * SUPABASE MIGRATION SQL SCHEMA
 * Copy and run this in your Supabase SQL Editor:
 * ====================================================================
 * 
 * -- 1. Create Trips Table
 * create table trips (
 *   id text primary key,
 *   "plannerName" text not null,
 *   "arrivalDate" text not null,
 *   "departureDate" text not null,
 *   destination text not null,
 *   lat double precision,
 *   lng double precision,
 *   "baseCurrency" text,
 *   "targetCurrency" text,
 *   "conversionRate" double precision,
 *   "ownerId" text,
 *   "isShared" boolean default false,
 *   "updatedAt" text not null
 * );
 * 
 * -- 2. Create Places Table
 * create table places (
 *   id text primary key,
 *   "tripId" text references trips(id) on delete cascade,
 *   name text not null,
 *   address text,
 *   time text,
 *   district text not null,
 *   category text not null,
 *   day text,
 *   lat double precision,
 *   lng double precision
 * );
 * 
 * -- 3. Enable Realtime on Trips and Places tables so updates sync immediately
 * alter publication supabase_realtime add table trips;
 * alter publication supabase_realtime add table places;
 * 
 * -- 4. Enable Row Level Security (RLS) & Add Policies (Optional, or turn off RLS for development)
 * alter table trips enable row level security;
 * alter table places enable row level security;
 * 
 * create policy "Public Access" on trips for all using (true);
 * create policy "Public Access" on places for all using (true);
 * ====================================================================
 */

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials missing! Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables or project secrets.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Self-executing diagnostic connection check
if (isSupabaseConfigured) {
  supabase.from('trips').select('id').limit(1)
    .then(({ error }) => {
      if (error) {
        // Handle common PG codes like missing table (42P01) or RLS policy errors gracefully
        if (error.code === '42P01') {
          console.warn('⚠️ Supabase Connected, but "trips" table was not found. Have you executed the migration SQL in your Supabase SQL Editor? See src/supabase.ts for the SQL commands.');
        } else {
          console.error('❌ Supabase Connection Diagnostic Error:', error.message, `(Code: ${error.code})`);
        }
      } else {
        console.log('✨ [Supabase] Connection Diagnostic: Successfully authenticated & connected to your database!');
      }
    })
    .catch(err => {
      console.error('❌ Supabase Connection Diagnostic Exception:', err);
    });
}

// Custom User Mapping (Maps Supabase user object structure to match Firebase user properties used in the application)
export function mapSupabaseUser(sbUser: any) {
  if (!sbUser) return null;
  return {
    uid: sbUser.id,
    email: sbUser.email,
    displayName:
      sbUser.user_metadata?.displayName ||
      sbUser.user_metadata?.name ||
      sbUser.user_metadata?.full_name ||
      sbUser.email?.split('@')[0] ||
      'Explorer',
    photoURL: sbUser.user_metadata?.avatar_url || null,
    avatar: sbUser.user_metadata?.avatar_url || '',
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleSupabaseError(error: any, operationType: OperationType, path: string) {
  const errInfo = {
    error: error?.message || String(error),
    operationType,
    path,
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
