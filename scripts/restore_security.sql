-- Run this in your Supabase SQL Editor to restore security limits

-- 1. Restore Creator IP Constraint
ALTER TABLE agents 
ADD CONSTRAINT unique_creator_ip UNIQUE (creator_ip_hash);

-- 2. Restore Device Fingerprint Constraint
ALTER TABLE agents 
ADD CONSTRAINT unique_device_fingerprint UNIQUE (device_fingerprint);

-- Note: If you get an error about duplicate keys, run this first to find duplicates:
-- SELECT creator_ip_hash, COUNT(*) FROM agents GROUP BY creator_ip_hash HAVING COUNT(*) > 1;
-- SELECT device_fingerprint, COUNT(*) FROM agents WHERE device_fingerprint IS NOT NULL GROUP BY device_fingerprint HAVING COUNT(*) > 1;
