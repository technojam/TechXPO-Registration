# TechXpo Registration Platform

A secure, scalable event registration platform built with Next.js 15, Firebase, and Azure. This application allows administrators to create and manage events while providing a seamless registration experience for users.

## 🚀 Features

### Public Facing
- **Dynamic Event Listing:** View all upcoming events with real-time updates.
- **Detailed Event Pages:** Rich text descriptions, location maps, schedules, and custom FAQs.
- **Secure Registration:**
    - Individual & Team registration support.
    - File uploads for payment proof (drag-and-drop).
    - Custom form questions (Text & Dropdown) specific to each event.
    - Real-time validation for team size and required fields.

### Admin Dashboard (Protected)
- **Secure Authentication:** Firebase specific login for administrators.
- **Event Management:** Create, Edit, Pause, and Delete events.
- **Registration Tracking:** View list of registrants in real-time.
- **CSV Export:** One-click data export for attendee management.
- **Custom Form Builder:** dynamically add questions to registration forms.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Lucide Icons
- **Database:** Azure Cosmos DB (NoSQL)
- **Storage:** Azure Blob Storage (Images)
- **Auth:** Firebase Auth (Client) + Firebase Admin (Server Validation)
- **Validation:** Zod (Server-side data integrity)

## 🔒 Security Measures

- **Server-Side Auth:** API routes verify Firebase ID Tokens using `firebase-admin` to prevent unauthorized access.
- **Data Validation:** All incoming data is validated using `Zod` schemas to prevent injection and bad data.
- **File Security:** Uploads restricted by MIME type (Images only) and Size (Max 5MB).
- **Sensitive Data Stripping:** Public API endpoints automatically remove sensitive fields (like registrant lists) for non-admin users.

## 📦 Local Development Strategy

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/yourusername/techxpo.git
    cd techxpo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file with the following credentials:
    ```env
    # Azure Cosmos DB
    AZURE_COSMOS_CONNECTION_STRING="AccountEndpoint=https://...;"

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."
    AZURE_CONTAINER_NAME="uploads"

    # Firebase Client (Public)
    NEXT_PUBLIC_FIREBASE_API_KEY="..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
    NEXT_PUBLIC_FIREBASE_APP_ID="..."

    # Firebase Admin (Private - Needed for Server API Security)
    FIREBASE_CLIENT_EMAIL="firebase-adminsdk-..."
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
    ```

4.  **Run the server:**
    ```bash
    npm run dev
    ```

## ☁️ Deployment on Vercel

1.  Push your code to a GitHub repository.
2.  Import the project into [Vercel](https://vercel.com).
3.  **Crucial:** Add all the Environment Variables from `.env.local` to the Vercel project settings.
    *   *Note:* Copy the `FIREBASE_PRIVATE_KEY` content exactly as is (including newlines).
4.  Deploy!

## 📄 License

This project is licensed under the MIT License.
