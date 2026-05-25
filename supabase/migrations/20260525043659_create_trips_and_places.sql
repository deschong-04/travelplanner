/*
  # Create trips and places tables

  1. New Tables
    - `trips`
      - `id` (text, primary key)
      - `plannerName` (text)
      - `arrivalDate` (text)
      - `departureDate` (text)
      - `destination` (text)
      - `lat` (double precision)
      - `lng` (double precision)
      - `baseCurrency` (text)
      - `targetCurrency` (text)
      - `conversionRate` (double precision)
      - `ownerId` (text)
      - `isShared` (boolean, default false)
      - `updatedAt` (text)
    - `places`
      - `id` (text, primary key)
      - `tripId` (text, foreign key -> trips.id, cascade delete)
      - `name` (text)
      - `address` (text)
      - `time` (text)
      - `district` (text)
      - `category` (text)
      - `day` (text)
      - `lat` (double precision)
      - `lng` (double precision)

  2. Security
    - Enable RLS on both tables
    - Allow authenticated users to manage their own trips (by ownerId = auth.uid())
    - Allow authenticated users to access places belonging to their trips
    - Allow reading shared trips by any authenticated user

  3. Realtime
    - Enable realtime on both tables for live sync
*/

CREATE TABLE IF NOT EXISTS trips (
  id text PRIMARY KEY,
  "plannerName" text NOT NULL DEFAULT '',
  "arrivalDate" text NOT NULL DEFAULT '',
  "departureDate" text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  "baseCurrency" text DEFAULT '',
  "targetCurrency" text DEFAULT '',
  "conversionRate" double precision DEFAULT 1,
  "ownerId" text,
  "isShared" boolean DEFAULT false,
  "updatedAt" text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS places (
  id text PRIMARY KEY,
  "tripId" text REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  address text DEFAULT '',
  time text DEFAULT '',
  district text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  day text DEFAULT '',
  lat double precision,
  lng double precision
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Trips: owners can read their own trips
CREATE POLICY "Owners can read own trips"
  ON trips FOR SELECT
  TO authenticated
  USING ("ownerId" = auth.uid()::text OR "isShared" = true);

-- Trips: owners can insert trips
CREATE POLICY "Owners can insert own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK ("ownerId" = auth.uid()::text);

-- Trips: owners can update their own trips
CREATE POLICY "Owners can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING ("ownerId" = auth.uid()::text)
  WITH CHECK ("ownerId" = auth.uid()::text);

-- Trips: owners can delete their own trips
CREATE POLICY "Owners can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING ("ownerId" = auth.uid()::text);

-- Places: users can read places belonging to accessible trips
CREATE POLICY "Users can read places of accessible trips"
  ON places FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = places."tripId"
      AND (trips."ownerId" = auth.uid()::text OR trips."isShared" = true)
    )
  );

-- Places: users can insert places into their own trips
CREATE POLICY "Users can insert places into own trips"
  ON places FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = places."tripId"
      AND trips."ownerId" = auth.uid()::text
    )
  );

-- Places: users can update places in their own trips
CREATE POLICY "Users can update places in own trips"
  ON places FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = places."tripId"
      AND trips."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = places."tripId"
      AND trips."ownerId" = auth.uid()::text
    )
  );

-- Places: users can delete places from their own trips
CREATE POLICY "Users can delete places from own trips"
  ON places FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = places."tripId"
      AND trips."ownerId" = auth.uid()::text
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE places;
