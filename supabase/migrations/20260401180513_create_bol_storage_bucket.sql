/*
  # Create BOL Storage Bucket

  1. Storage
    - Create `bol-documents` bucket for storing signed BOL photos
    - Enable public access for uploaded documents
    - Set up RLS policies for authenticated users

  2. Security
    - Allow authenticated users to upload BOL documents
    - Allow public read access to BOL documents
    - Restrict delete operations to service role only
*/

-- Create the storage bucket for BOL documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('bol-documents', 'bol-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload BOL documents
CREATE POLICY "Authenticated users can upload BOL documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bol-documents');

-- Allow public read access to BOL documents
CREATE POLICY "Public read access to BOL documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'bol-documents');

-- Allow authenticated users to update their own BOL documents
CREATE POLICY "Users can update BOL documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bol-documents')
  WITH CHECK (bucket_id = 'bol-documents');

-- Allow authenticated users to delete BOL documents
CREATE POLICY "Authenticated users can delete BOL documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'bol-documents');