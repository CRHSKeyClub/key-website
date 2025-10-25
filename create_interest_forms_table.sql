-- Create interest forms table to store t-shirt size data
-- Run this in your Supabase SQL Editor

-- Create interest_forms table
CREATE TABLE IF NOT EXISTS interest_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  s_number VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  tshirt_size VARCHAR(10),
  phone VARCHAR(20),
  grade VARCHAR(10),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Add constraints
ALTER TABLE interest_forms 
ADD CONSTRAINT valid_interest_tshirt_size 
CHECK (tshirt_size IS NULL OR tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interest_forms_s_number ON interest_forms(s_number);
CREATE INDEX IF NOT EXISTS idx_interest_forms_processed ON interest_forms(processed);

-- Add comments
COMMENT ON TABLE interest_forms IS 'Stores interest form submissions with t-shirt sizes';
COMMENT ON COLUMN interest_forms.processed IS 'Whether this form has been processed and data transferred to students table';
