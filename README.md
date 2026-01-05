# TechXpo Registration Platform

This is a Next.js application for managing events and registrations for TechXpo.

## Features

- **Event Management**: Create events with title, description, date, location, and header image.
- **Image Upload**: Support for uploading event header images.
- **Event Listing**: View all upcoming events on the home page.
- **Registration**: Register for specific events with name, email, and optional team name.

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

- `app/page.tsx`: Home page listing all events.
- `app/admin/create-event/page.tsx`: Admin page to create new events.
- `app/events/[id]/page.tsx`: Event details and registration page.
- `app/api/events`: API routes for event management.
- `app/api/upload`: API route for image uploads.
- `data/events.json`: JSON file storing event data (created automatically).
- `public/uploads`: Directory storing uploaded images.

## Technologies

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React (Icons)
