# Supabase Setup Guide for MilkPick

This guide will walk you through setting up Supabase for the MilkPick application.

## Prerequisites

- A Supabase account (free tier available at [supabase.com](https://supabase.com))
- The MilkPick database schema (located in `backend/src/config/schema.sql`)

## Step 1: Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "New Project"
3. Sign in or create an account
4. Click "New project" in your organization
5. Fill in the project details:
   - **Name**: MilkPick (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is fine for development
6. Click "Create new project"
7. Wait for the project to be provisioned (takes 1-2 minutes)

## Step 2: Get Your API Keys

1. Once the project is created, click on the "Settings" icon (gear) in the sidebar
2. Go to "API" section
3. Copy the following values (you'll need them for your `.env` file):
   - **Project URL**: This is your `SUPABASE_URL`
   - **anon/public key**: This is your `SUPABASE_ANON_KEY`
   - **service_role key**: This is your `SUPABASE_SERVICE_KEY` (keep this secret!)

## Step 3: Configure Environment Variables

1. In your backend directory, copy `.env.example` to `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   ```

3. Do the same for the frontend:
   ```bash
   cd ../frontend
   cp .env.example .env
   ```

4. Edit the frontend `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run Database Migrations

1. In Supabase Dashboard, click on the "SQL Editor" icon in the sidebar
2. Click "New Query"
3. Open the file `backend/src/config/schema.sql` in your code editor
4. Copy the entire contents of the schema.sql file
5. Paste it into the Supabase SQL Editor
6. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
7. Wait for the migration to complete
8. You should see "Success. No rows returned" message

## Step 5: Verify Database Tables

1. Click on the "Table Editor" icon in the sidebar
2. You should see all the tables created:
   - users
   - farms
   - products
   - subscriptions
   - orders
   - inventory
   - surplus_alerts
   - notifications
   - payment_methods
   - transactions
   - settings

## Step 6: Configure Authentication

1. Click on "Authentication" icon in the sidebar
2. Go to "Settings" tab
3. Configure the following:

### Email Auth
- Enable email authentication
- Disable "Confirm email" for development (enable for production)

### Site URL
- Set to: `http://localhost:3000` (development)
- For production, use your actual domain

### Redirect URLs
- Add: `http://localhost:3000/**` (development)
- For production, add your production URLs

## Step 7: Configure Storage (Optional - for product images)

1. Click on "Storage" icon in the sidebar
2. Click "Create a new bucket"
3. Name it: `product-images`
4. Set to "Public bucket" (for product images)
5. Click "Create bucket"

### Create Storage Policies
1. Click on the "product-images" bucket
2. Go to "Policies" tab
3. Click "New Policy"
4. Add the following policies:

**SELECT (Public Read):**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );
```

**INSERT (Authenticated Upload):**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);
```

## Step 8: Test the Connection

1. In your backend directory, install dependencies:
   ```bash
   npm install
   ```

2. Start the backend server:
   ```bash
   npm run dev
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:5000/health
   ```

4. You should see:
   ```json
   {"status":"ok","message":"MilkPick API is running"}
   ```

## Step 9: Configure Row Level Security (RLS) Policies

For now, RLS is enabled but no policies are active. This means data access will be restricted. You'll need to add RLS policies based on your security requirements.

### Example: Allow users to read their own data
```sql
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id);
```

More policies will be added as we develop the authentication system in Phase 2.

## Step 10: Optional - Supabase CLI Setup

For advanced users, you can use the Supabase CLI for migrations:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

3. Pull the schema:
   ```bash
   supabase db pull
   ```

## Troubleshooting

### Can't connect to Supabase
- Check that your API keys are correct in `.env`
- Make sure the Supabase URL doesn't have a trailing slash
- Verify your project is running in the Supabase dashboard

### Migration errors
- Check SQL syntax in schema.sql
- Run migrations one section at a time to identify issues
- Check Supabase logs in the dashboard

### Storage upload issues
- Verify bucket exists and is public
- Check storage policies are configured
- Ensure file size is within limits (free tier: 1GB)

## Next Steps

Once Supabase is set up:
1. Move to Phase 2: Authentication & User Management
2. Test user registration and login
3. Implement RLS policies for data security

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** 2026-01-27
