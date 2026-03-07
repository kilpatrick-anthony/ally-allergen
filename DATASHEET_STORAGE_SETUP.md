# Supabase Storage Setup for Datasheets

## Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `datasheets`
   - **Public bucket**: ✅ **Enable** (so users can view/download their datasheets)
   - **File size limit**: 50 MB (or your preferred limit)
   - **Allowed MIME types**: Leave empty or specify: `application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*`

5. Click **Create bucket**

## Step 2: Set up Storage Policies (RLS)

After creating the bucket, you need to set up Row Level Security policies:

1. Click on the `datasheets` bucket
2. Go to **Policies** tab
3. Click **New policy**

### Policy 1: Allow users to upload to their business folder

```sql
-- Policy name: Users can upload datasheets for their business
-- Operation: INSERT
-- Policy definition:
bucket_id = 'datasheets' AND 
(storage.foldername(name))[1] IN (
  SELECT business_id::text FROM user_businesses 
  WHERE user_id = auth.uid()
)
```

### Policy 2: Allow users to view datasheets from their business

```sql
-- Policy name: Users can view datasheets for their business  
-- Operation: SELECT
-- Policy definition:
bucket_id = 'datasheets' AND
(storage.foldername(name))[1] IN (
  SELECT business_id::text FROM user_businesses 
  WHERE user_id = auth.uid()
)
```

### Policy 3: Allow users to delete datasheets from their business

```sql
-- Policy name: Users can delete datasheets for their business
-- Operation: DELETE  
-- Policy definition:
bucket_id = 'datasheets' AND
(storage.foldername(name))[1] IN (
  SELECT business_id::text FROM user_businesses 
  WHERE user_id = auth.uid()
)
```

## Step 3: Test the Setup

After completing the setup:

1. Restart your Next.js dev server
2. Go to `/admin/ingredients/new`
3. Fill in ingredient details
4. Drag and drop a PDF file into the datasheet uploader
5. Save the ingredient
6. View the ingredient - you should see the datasheet listed
7. Click the link icon to view/download the file

## Troubleshooting

### Error: "Failed to upload file: new row violates row-level security policy"

This means the storage bucket policies aren't set up correctly. Double-check:
- The bucket name is exactly `datasheets`
- All three policies (INSERT, SELECT, DELETE) are created
- The policies reference the correct tables (user_businesses)

### Error: "Bucket not found"

- Make sure the bucket name is exactly `datasheets` (lowercase, no spaces)
- Verify the bucket exists in your Supabase project

### Files upload but don't display

- Check that the bucket is set to **Public**
- Verify the SELECT policy is created and enabled

## Alternative: Manual SQL Setup

You can also set up the policies via SQL:

```sql
-- Create storage bucket policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('datasheets', 'datasheets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload to their business folder
CREATE POLICY "Users can upload datasheets for their business"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'datasheets' AND
  (storage.foldername(name))[1] IN (
    SELECT business_id::text FROM user_businesses 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to view their business datasheets
CREATE POLICY "Users can view datasheets for their business"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'datasheets' AND
  (storage.foldername(name))[1] IN (
    SELECT business_id::text FROM user_businesses 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their business datasheets
CREATE POLICY "Users can delete datasheets for their business"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'datesheets' AND
  (storage.foldername(name))[1] IN (
    SELECT business_id::text FROM user_businesses 
    WHERE user_id = auth.uid()
  )
);
```
