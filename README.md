# AI Video Platform

An AI-powered video sharing platform where users can upload, discover, and manage AI-generated videos.

## Features

- 🎥 **Video Sharing**: Upload and share AI-generated videos
- 🤖 **AI Recommendations**: Personalized video recommendations using Lovable AI
- 👤 **User Profiles**: Customizable profiles with avatars and banners
- 📋 **Playlists**: Create and manage video playlists
- 📊 **Watch History**: Track your viewing history
- ⭐ **Favorites**: Save videos for later
- 🎯 **Content Filtering**: Age-appropriate content filters
- 💬 **Comments**: Engage with the community
- 🔒 **Secure**: Row-Level Security (RLS) on all database tables

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Database Schema](./SCHEMA.md)** - Complete database structure and RLS policies
- **[Edge Functions](./supabase/FUNCTIONS.md)** - Backend API reference
- **[Migrations](./docs/MIGRATIONS.md)** - Database migration history and best practices
- **[Architecture Overview](./docs/README.md)** - System architecture and data flows

## Project info

**URL**: https://lovable.dev/projects/0f4fad12-d713-4345-8940-14db6da381b1

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0f4fad12-d713-4345-8940-14db6da381b1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Technologies

This project is built with:

- **Frontend**: Vite, TypeScript, React, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Storage)
- **AI**: Lovable AI (Gemini 2.5 Flash) for recommendations
- **Authentication**: Supabase Auth with JWT
- **Storage**: Supabase Storage for videos and images

## Database Structure

### Core Tables
- `profiles` - User profiles and preferences
- `videos` - Video content and metadata
- `likes` - Video interactions (like/dislike)
- `comments` - Video comments
- `favorites` - Saved videos
- `playlists` - User-created playlists
- `watch_history` - Viewing history
- `directories` - Video organization
- `reports` - Content reports

### Features
- **Row-Level Security (RLS)** on all tables
- **Indexes** for optimized queries
- **Triggers** for automatic updates
- **Full-text search** on titles and tags

See [SCHEMA.md](./SCHEMA.md) for complete documentation.

## Edge Functions

### recommend-videos
Generates personalized video recommendations using AI based on user watch history.

See [FUNCTIONS.md](./supabase/FUNCTIONS.md) for complete API documentation.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0f4fad12-d713-4345-8940-14db6da381b1) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Development

### Prerequisites
- Node.js & npm (install with [nvm](https://github.com/nvm-sh/nvm))
- Supabase account (automatic with Lovable Cloud)

### Environment Variables
The following are automatically configured via Lovable Cloud:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `LOVABLE_API_KEY` - Lovable AI gateway key

### Running Locally
```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Database Migrations
Migrations are automatically applied. To create a new migration:

1. Use the Supabase migration tool
2. Test thoroughly with RLS policies
3. Document in [MIGRATIONS.md](./docs/MIGRATIONS.md)
4. Follow best practices in migration guide

See [MIGRATIONS.md](./docs/MIGRATIONS.md) for detailed guidance.

## Contributing

1. Read the [documentation](./docs/README.md)
2. Follow existing code patterns
3. Add appropriate indexes and RLS policies
4. Update documentation for new features
5. Test thoroughly before committing

## License

This project is created with Lovable.dev
