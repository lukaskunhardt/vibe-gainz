# Vibe Gainz 💪

<div align="center">

**High-Volume Calisthenics Tracking App**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com/)

Track your push, pull, and leg movements with intelligent volume progression and recovery monitoring.

[Getting Started](#getting-started) • [Features](#features) • [Methodology](#training-methodology) • [Tech Stack](#tech-stack)

</div>

## Overview

Vibe Gainz is a calisthenics training tracker built on Kyle Bogemans' high-volume bodyweight training methodology. The app automatically calculates daily targets, monitors recovery, and adjusts volume based on performance to help you build muscle with bodyweight exercises.

### Key Features

- 🎯 **Smart Daily Targets** - Automatically calculated at 80% of max effort
- 📊 **Weekly Recovery Scores** - Comprehensive assessment of performance, RPE efficiency, and consistency
- 📈 **Progressive Overload** - Auto-progression from beginner to advanced exercise variations
- 💡 **RPE Guidance** - Intelligent recommendations to optimize stimulus vs. fatigue
- 📱 **Mobile-First Design** - Optimized for quick logging throughout the day

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account

### Installation

1. **Clone and install dependencies:**

```bash
cd vibe-gainz
pnpm install
```

2. **Set up environment variables:**

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run database migrations:**

Go to your Supabase project dashboard → SQL Editor, and run the migration from `supabase/migrations/001_initial_schema.sql`

This creates:
- Database tables (profiles, movements, sets, weekly_reviews, max_effort_prompts)
- Row Level Security (RLS) policies
- Necessary indexes

4. **Start the development server:**

```bash
pnpm dev
```

Visit http://localhost:3000 and create an account!

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## Features

### 📋 Dashboard
- Overview of all three movement categories (Push, Pull, Legs)
- Real-time progress tracking (current reps vs. daily target)
- Max effort test notifications
- Quick access to log sets or view exercise information

### 🏋️ Movement Tracking
- **Push**: Push-ups, weighted push-ups, archer push-ups, one-arm push-ups
- **Pull**: Rows, pull-ups, weighted pull-ups, archer pull-ups, one-arm pull-ups
- **Legs**: Squats, lunges, pistol squats, jump squats, weighted squats
- Progression exercises for beginners
- Detailed form cues and video demonstrations (placeholders)

### 📝 Set Logging
- Quick rep counter with +/- buttons
- RPE (Rate of Perceived Exertion) selector
- Intelligent rep predictions based on previous sets
- RPE 10 confirmation modal (distinguish max effort vs. regular high-effort set)

### 📅 Weekly Reviews (Mondays)
Comprehensive recovery assessment based on:
- **First Set Performance** (40 pts) - Average first set vs. max effort
- **RPE Efficiency** (30 pts) - Percentage of sets in optimal range (RPE 6-8)
- **Target Achievement** (20 pts) - Days where daily target was met
- **Consistency** (10 pts) - Number of training days in the week

Volume adjustments based on recovery score:
- 85-100: +25% volume
- 70-84: +15% volume
- 55-69: +10% volume
- 40-54: +5% volume
- 20-39: Maintain
- 0-19: -12.5% volume (deload)

### 📊 Progress Statistics
- Daily volume charts (last 14 days)
- Recovery score trends over time
- Max effort progression tracking
- Total reps and sets summaries

### ⚙️ Settings
- Account information
- Training methodology overview
- Data reset option

## Training Methodology

Based on Kyle Bogemans' approach to high-volume calisthenics:

### Core Principles

1. **Volume Over Intensity**
   - Start at 80% of max effort reps for daily target
   - Spread reps throughout the day (greasing the groove)
   - Focus on accumulating volume rather than training to failure

2. **RPE Management**
   - Most sets at RPE 6-8 (could do 2-4 more reps)
   - Avoid RPE 10 (failure) except for max effort tests
   - Training to failure causes excessive fatigue with minimal additional stimulus

3. **Weekly Assessment**
   - Review performance every Monday
   - Adjust volume based on recovery score
   - Listen to your body - manual override available

4. **Progressive Overload**
   - Gradual volume increases (5-25% per week based on recovery)
   - Auto-progression to harder variations when ready (20+ reps on max effort)
   - Move from beginner to advanced exercises systematically

### Example Week

**Monday**: Max effort test (if due), weekly review, adjust targets
**Tuesday-Sunday**: Spread daily target reps throughout the day at RPE 6-8

**Sample Daily Flow**:
- Morning: 3 sets of push-ups
- Midday: 2 sets of push-ups
- Evening: 2 sets of push-ups
- Goal: Hit daily target without excessive fatigue

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)
- **Security**: Row Level Security (RLS) policies
- **Real-time**: Supabase real-time subscriptions (future enhancement)

### Developer Tools
- **Linting**: ESLint (Next.js config)
- **Formatting**: Prettier with Tailwind plugin
- **Type Safety**: TypeScript strict mode
- **Date Handling**: date-fns

## Project Structure

```
vibe-gainz/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── dashboard/           # Main dashboard
│   │   ├── movement/            # Movement selection, recording, info
│   │   ├── weekly-review/       # Weekly review flow
│   │   ├── stats/               # Progress statistics
│   │   └── settings/            # App settings
│   ├── auth/                    # Authentication screens
│   ├── onboarding/              # First-time user setup
│   └── page.tsx                 # Landing page
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── dashboard/               # Dashboard-specific components
│   ├── movement/                # Movement selection & info
│   ├── recording/               # Set logging components
│   ├── weekly-review/           # Recovery score components
│   ├── stats/                   # Chart and stat components
│   └── onboarding/              # Onboarding flow
├── lib/
│   ├── supabase/               # Supabase client configuration
│   ├── constants/              # Exercise data, progression rules
│   ├── utils/                  # Calculations, predictions, helpers
│   └── hooks/                  # Custom React hooks
├── types/                      # TypeScript type definitions
└── supabase/
    └── migrations/             # Database schema
```

## Database Schema

### Core Tables
- **profiles** - User profiles with onboarding status
- **movements** - User's active movements (push/pull/legs)
- **sets** - Individual set logs with reps and RPE
- **weekly_reviews** - Recovery scores and volume adjustments
- **max_effort_prompts** - Notifications for max effort tests

All tables have Row Level Security enabled to ensure users can only access their own data.

## Scripts

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
```

## Future Enhancements

- [ ] Progressive Web App (PWA) support
- [ ] Push notifications for daily reminders
- [ ] Social features (compare progress with friends)
- [ ] Custom exercise variations
- [ ] Export training data
- [ ] Dark mode improvements
- [ ] Mobile app (React Native)

## Contributing

This is a personal project, but suggestions and feedback are welcome! Feel free to open an issue or submit a pull request.

## License

MIT License - feel free to use this project for your own training!

## Acknowledgments

- Training methodology based on [Kyle Bogemans' YouTube channel](https://www.youtube.com/@KyleBogemans)
- Built with the [Next.js Supabase Starter](https://github.com/vercel/next.js/tree/canary/examples/with-supabase)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

<div align="center">
Made with 💪 for bodyweight training enthusiasts
</div>
