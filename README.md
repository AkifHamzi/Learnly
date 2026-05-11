# Learnly

A short-form video learning platform for 16+ students. Teachers post 60–90 second vertical lessons tagged by subject; students browse the feed, like videos, and organise their learning on collaborative whiteboards with sticky notes and real-time team chat.

## Tech stack

- **Frontend:** React 18 + Vite
- **Routing:** React Router
- **Backend & Auth:** Supabase (Postgres, Auth, Storage, Realtime)
- **Icons:** lucide-react

## Features

- Email/password authentication with role selection (student or teacher)
- Teachers can upload short videos tagged by subject
- TikTok-style vertical video feed with autoplay-on-scroll, like button, and mute toggle
- Personalised student dashboard with weekly activity, day streak, total likes, recent boards, and saved videos
- Collaborative whiteboards with coloured sticky notes, an attached reference lesson video, and real-time team chat powered by Supabase Realtime
- Saved videos library
- Account settings and FAQ pages

## Database schema

Six Postgres tables managed via Supabase: `profiles`, `videos`, `boards`, `board_members`, `likes`, `comments`. Row-level security policies restrict writes to the owning user.

## Setup

1. Clone the repo:
```bash
   git clone https://github.com/AkifHamzi/Learnly.git
   cd Learnly
```
2. Install dependencies:
```bash
   npm install
```
3. Create a `.env` file in the project root with your Supabase credentials:

4. Run the dev server:
```bash
   npm run dev
```

## Known limitations & planned next iterations

- **Draggable sticky notes:** The canvas currently uses a responsive grid. A free-positioning drag-and-drop canvas is the planned next iteration.
- **Board invites:** The `board_members` table and `boards.share_token` field are wired for invite-based access; a share modal is the planned next step.
- **Auto-profile creation:** A Postgres trigger on `auth.users` insert is planned so signup atomically creates a profile row, avoiding edge cases where the client-side insert can fail.
- **View tracking:** No video views table yet; engagement metrics on the dashboard are based on likes.

## Author

Akif Hamzi