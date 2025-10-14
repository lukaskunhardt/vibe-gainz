# Vibe Gainz Setup Guide

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Supabase account (already created with .env.local configured)

## Current Status

✅ Project initialized with Next.js 15 + Supabase starter
✅ Dependencies installed (Tailwind, shadcn/ui, date-fns, recharts)
✅ TypeScript types and database schema defined
✅ All core components and screens built
✅ .env.local configured with Supabase credentials

## Next Steps: Database Migration

Since your Supabase database is connected, you need to run the database migrations to create all the necessary tables and Row Level Security policies.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

The migration will create:
- `movement_category` enum type
- `profiles` table
- `movements` table
- `sets` table
- `weekly_reviews` table
- `max_effort_prompts` table
- All necessary indexes
- Row Level Security (RLS) policies

### Option 2: Using Supabase CLI (Advanced)

If you want to use the Supabase CLI:

```bash
# Install Supabase CLI
pnpm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

## Running the Application

Once the database is set up:

```bash
# Start the development server
pnpm dev
```

The app will be available at http://localhost:3000

## First Time User Flow

1. Visit http://localhost:3000 - You'll see the landing page
2. Click "Get Started Free" or "Sign In"
3. Sign up with email/password
4. Complete the onboarding flow:
   - Set up your **Push** movement (e.g., regular push-ups)
   - Perform a max effort test
   - Set up your **Pull** movement (e.g., pull-ups)
   - Perform a max effort test
   - Set up your **Legs** movement (e.g., squats)
   - Perform a max effort test
5. You'll be redirected to the dashboard

## App Features

### Dashboard
- View progress for all three movement categories
- See current daily targets vs. completed reps
- Get notified when max effort tests are available
- Quick access to log sets or view exercise info

### Recording Sets
- Log reps with RPE (Rate of Perceived Exertion)
- Intelligent rep prediction based on previous sets
- RPE 10 confirmation modal (max effort vs. regular set)
- Auto-progression for non-standard exercises

### Weekly Review (Mondays)
- Calculate recovery score based on:
  - First set performance (40 points)
  - RPE efficiency (30 points)
  - Target achievement (20 points)
  - Consistency (10 points)
- Suggested volume adjustments:
  - 85+ score: +25% volume
  - 70-84 score: +15% volume
  - 55-69 score: +10% volume
  - 40-54 score: +5% volume
  - 20-39 score: maintain
  - <20 score: -12.5% volume
- Manual override option

### Stats Page
- View progress charts for each movement
- Daily volume trends
- Recovery score history
- Max effort progression

### Settings
- View account information
- Learn about the training methodology
- Reset all data (danger zone)

## Training Methodology

Based on Kyle Bogemans' high-volume calisthenics approach:

1. **Initial Target**: 80% of max effort reps
2. **Daily Practice**: Spread reps throughout the day
3. **RPE Management**: Most sets at RPE 6-8, avoid failure
4. **Weekly Assessment**: Monday reviews to adjust volume
5. **Progressive Overload**: Gradual increases based on recovery
6. **Auto-Progression**: Move to harder variations when ready

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Charts**: Recharts
- **Date Utils**: date-fns

## Project Structure

```
/vibe-gainz
├── app/                          # Next.js app directory
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── movement/
│   │   ├── weekly-review/
│   │   ├── stats/
│   │   └── settings/
│   ├── auth/                    # Auth routes (from starter)
│   ├── onboarding/              # First-time user setup
│   └── page.tsx                 # Landing page
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── dashboard/
│   ├── movement/
│   ├── recording/
│   ├── weekly-review/
│   ├── stats/
│   ├── settings/
│   └── onboarding/
├── lib/
│   ├── supabase/               # Supabase clients
│   ├── constants/              # Exercise data, progression rules
│   ├── utils/                  # Calculations, predictions, date helpers
│   └── hooks/                  # React hooks for data fetching
├── types/                      # TypeScript type definitions
└── supabase/
    └── migrations/             # Database schema
```

## Troubleshooting

### "No database connection"
- Verify your `.env.local` file has correct Supabase URL and anon key
- Check that the database migration has been run

### "User not authorized" errors
- Make sure RLS policies were created during migration
- Check that you're logged in

### Onboarding doesn't redirect to dashboard
- Check that the `profiles` table exists
- Verify `onboarding_completed` is being set to `true`

### Weekly review not showing up on Monday
- Must have at least one movement configured
- Must have training data from the previous week
- Review must not already exist for that week

## Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Format code with Prettier
pnpm format
```

## Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check the Supabase dashboard logs
3. Verify all migrations ran successfully
4. Ensure RLS policies are enabled

Happy training! 💪

