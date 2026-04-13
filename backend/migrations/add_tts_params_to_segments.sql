-- Migration: Add TTS parameter fields to timeline_segments table
-- Run this script to update the database schema

ALTER TABLE timeline_segments
ADD COLUMN tts_speed FLOAT DEFAULT 1.0;

ALTER TABLE timeline_segments
ADD COLUMN tts_pitch FLOAT DEFAULT 0.0;

ALTER TABLE timeline_segments
ADD COLUMN tts_volume FLOAT DEFAULT 80.0;

-- Verify the columns were added
PRAGMA table_info(timeline_segments);
