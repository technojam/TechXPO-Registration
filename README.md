# TechXpo Registration Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Azure](https://img.shields.io/badge/Azure-Cloud-0078D4?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A secure, scalable event registration platform built with Next.js 15, Firebase, and Azure. This application allows administrators to create and manage events while providing a seamless registration experience for users.

---

## ✨ Features at a Glance

✅ **Full-stack TypeScript** with Next.js 15 App Router  
✅ **Azure Cosmos DB** for scalable NoSQL storage  
✅ **Firebase Authentication** with admin role management  
✅ **Team & Individual** registration workflows  
✅ **Custom form builder** with dynamic questions  
✅ **File uploads** to Azure Blob Storage with SAS security  
✅ **Automated emails** via Azure Communication Services  
✅ **CSV export** for attendee data  
✅ **Responsive UI** with Tailwind CSS  
✅ **Production-ready** with comprehensive error handling  

---

## 🚀 Features

### Public Facing
- **Dynamic Event Listing:** View all upcoming events with real-time updates.
- **Detailed Event Pages:** Rich text descriptions, location maps, schedules, and custom FAQs.
- **Secure Registration:**
    - Individual & Team registration support.
    - File uploads for payment proof (drag-and-drop).
    - Custom form questions (Text & Dropdown) specific to each event.
    - Real-time validation for team size and required fields.
    - Multi-step wizard for team registrations.
    - Automatic email trimming to prevent whitespace errors.
- **Event Categories:** Support for 13+ event types (Hackathons, Workshops, CTF, Gaming, etc.)
- **Confirmation Emails:** Automated HTML emails with event details and registration info.

### Admin Dashboard (Protected)
- **Secure Authentication:** Firebase specific login for administrators.
- **Event Management:** Create, Edit, Pause, and Delete events.
- **Registration Tracking:** View list of registrants in real-time.
- **CSV Export:** One-click data export for attendee management.
- **Custom Form Builder:** dynamically add questions to registration forms.
- **Email Configuration:** Toggle confirmation emails per event.
- **Resend Emails:** Manually resend confirmation emails to specific registrants.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Lucide Icons
- **Database:** Azure Cosmos DB (NoSQL)
- **Storage:** Azure Blob Storage (Images)
- **Email:** Azure Communication Services (Optional)
- **Serverless:** Azure Functions (Async Email Processing)
- **Auth:** Firebase Auth (Client) + Firebase Admin (Server Validation)
- **Validation:** Zod (Server-side data integrity)
- **Deployment:** Vercel (with Vercel Functions for async operations)

## 🔒 Security Measures

- **Server-Side Auth:** API routes verify Firebase ID Tokens using `firebase-admin` to prevent unauthorized access.
- **Admin Access Control:** Optional `ADMIN_EMAILS` whitelist for restricting admin panel access.
- **Data Validation:** All incoming data is validated using `Zod` schemas to prevent injection and bad data.
- **File Security:** 
  - Uploads restricted by MIME type (Images only) and Size (Max 5MB).
  - Azure Blob Storage with SAS token authentication (not publicly accessible).
- **Sensitive Data Stripping:** Public API endpoints automatically remove sensitive fields (like registrant lists) for non-admin users.
- **Email Trimming:** All email inputs are automatically trimmed to prevent accidental whitespace issues.
- **Rate Limiting:** Proxy configuration for DoS protection (via Vercel Edge).
- **Automatic Cleanup:** When an event is deleted, all associated files (images, QR codes, payment proofs) are automatically removed from Azure Blob Storage to prevent orphaned data.

## 📦 Local Development Strategy

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/technojam/TechXPO-Registration.git
    cd TechXPO-Registration
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file with the following credentials:
    ```env
    # Azure Cosmos DB (Required)
    AZURE_COSMOS_CONNECTION_STRING="AccountEndpoint=https://...;"

    # Azure Blob Storage (Required)
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."
    AZURE_CONTAINER_NAME="uploads"

    # Firebase Client (Public - Required)
    NEXT_PUBLIC_FIREBASE_API_KEY="..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
    NEXT_PUBLIC_FIREBASE_APP_ID="..."

    # Firebase Admin (Private - Required for Server API Security)
    FIREBASE_CLIENT_EMAIL="firebase-adminsdk-..."
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
    
    # Admin Emails (Optional - Comma-separated list for admin verification)
    ADMIN_EMAILS="admin1@example.com,admin2@example.com"

    # Azure Communication Services (Optional - For Email Notifications)
    COMMUNICATION_SERVICES_CONNECTION_STRING="endpoint=https://...;"
    SENDER_EMAIL_ADDRESS="DoNotReply@your-domain.azurecomm.net"

    # Azure Function (Optional - For Async Email via Azure Functions)
    AZURE_EMAIL_FUNCTION_URL="https://your-function-app.azurewebsites.net/api/sendEmail"
    AZURE_EMAIL_FUNCTION_KEY="your-function-key"
    ```
    
    **Notes:**
    - Email functionality is **optional**. Events can disable confirmation emails via the admin panel.
    - If using Azure Managed Domains for email, sender must start with `DoNotReply@`.
    - `FIREBASE_PRIVATE_KEY` must include `\n` for newlines (will be auto-replaced in code).
    - `ADMIN_EMAILS` can restrict who can access the admin panel (leave empty to allow all Firebase users).

4.  **Run the server:**
    ```bash
    npm run dev
    ```

5.  **Open your browser:**
    Navigate to `http://localhost:3000`

## 🚀 Quick Start Guide

### First Time Setup
1. **Set up Azure Resources:**
   - Create an Azure Cosmos DB account (Free tier available)
   - Create an Azure Storage Account (For blob storage)
   - (Optional) Create Azure Communication Services for emails

2. **Set up Firebase:**
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Email/Password authentication
   - Generate a service account key (Settings → Service Accounts)
   - Copy the client config from Project Settings

3. **Configure Environment:**
   - Copy `.env.local.example` to `.env.local` (if exists) or create new
   - Add all required environment variables (see Environment Setup section)

4. **Create Your First Event:**
   - Run `npm run dev`
   - Navigate to `/admin/login`
   - Sign in with Firebase (or create account)
   - Click "Create New Event"
   - Fill in event details and publish!

### Admin Access
- By default, any Firebase user can access the admin panel
- To restrict access, set `ADMIN_EMAILS` in your environment variables
- Format: `ADMIN_EMAILS="admin1@example.com,admin2@example.com"`

## ☁️ Deployment on Vercel

1.  Push your code to a GitHub repository.
2.  Import the project into [Vercel](https://vercel.com).
3.  **Crucial:** Add all the Environment Variables from `.env.local` to the Vercel project settings.
    
    **Required Variables:**
    - `AZURE_COSMOS_CONNECTION_STRING`
    - `AZURE_STORAGE_CONNECTION_STRING`
    - `AZURE_CONTAINER_NAME`
    - `NEXT_PUBLIC_FIREBASE_API_KEY`
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    - `NEXT_PUBLIC_FIREBASE_APP_ID`
    - `FIREBASE_CLIENT_EMAIL`
    - `FIREBASE_PRIVATE_KEY`
    
    **Optional Variables (for email functionality):**
    - `COMMUNICATION_SERVICES_CONNECTION_STRING`
    - `SENDER_EMAIL_ADDRESS`
    - `AZURE_EMAIL_FUNCTION_URL`
    - `AZURE_EMAIL_FUNCTION_KEY`
    - `ADMIN_EMAILS`
    
    **Important Notes:**
    - Copy the `FIREBASE_PRIVATE_KEY` content exactly as is (including `\n` for newlines).
    - If deploying Azure Functions separately, set `AZURE_EMAIL_FUNCTION_URL` to your function endpoint.
4.  Deploy!

## 📧 Email Configuration (Optional)

The platform supports automated confirmation emails via **Azure Communication Services**:

1. **Direct Email (lib/email.ts):** Set `COMMUNICATION_SERVICES_CONNECTION_STRING` and `SENDER_EMAIL_ADDRESS`
2. **Azure Functions (Recommended for production):** Deploy the `azure-functions` folder and set:
   - `AZURE_EMAIL_FUNCTION_URL`
   - `AZURE_EMAIL_FUNCTION_KEY` (if using function-level auth)

Email sending can be toggled per-event in the admin dashboard via the "Send Confirmation Email" checkbox.

## 🎯 Supported Event Categories

The platform supports 13 event categories out of the box:
- **Hackathon** - Multi-day coding competitions
- **Workshop** - Hands-on learning sessions
- **CTF** - Capture The Flag cybersecurity challenges
- **Quiz** - Knowledge-based competitions
- **Hardware** - Electronics and robotics events
- **Design** - UI/UX and graphic design competitions
- **Gaming** - Esports and gaming tournaments
- **Entrepreneurship** - Startup pitches and business competitions
- **Tech Olympiad** - Multi-event technical competitions
- **Lectures** - Educational talks and seminars
- **Drone Arena** - Drone racing and flying competitions
- **Aerofield** - Aviation and aerospace events
- **Event** - Generic events that don't fit other categories

## ⚡ Azure Functions Setup (Optional)

For production deployment with email functionality:

1. **Navigate to the azure-functions directory:**
   ```bash
   cd azure-functions
   npm install
   ```

2. **Configure Azure Function App:**
   - Create a Function App in Azure Portal
   - Set runtime stack to **Node.js 20+**
   - Add environment variables:
     - `COMMUNICATION_SERVICES_CONNECTION_STRING`
     - `SENDER_EMAIL_ADDRESS`

3. **Deploy:**
   ```bash
   func azure functionapp publish <your-function-app-name>
   ```

4. **Update Vercel Environment:**
   - Set `AZURE_EMAIL_FUNCTION_URL` to your function endpoint
   - Set `AZURE_EMAIL_FUNCTION_KEY` if using function-level authorization

## 📂 Project Structure

```
TechXPO-Registration/
├── app/                          # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── events/             # Event CRUD & Registration
│   │   └── upload/             # File upload handler
│   ├── admin/                   # Protected admin dashboard
│   │   ├── login/
│   │   ├── create-event/
│   │   └── events/[id]/
│   ├── events/[id]/            # Public event pages
│   └── layout.tsx & page.tsx   # Root layout
├── azure-functions/              # Azure Functions for async email
│   └── src/functions/
│       └── sendEmail.ts
├── components/                   # React components
│   └── Navbar.tsx
├── lib/                          # Utilities & database
│   ├── db.ts                    # Cosmos DB operations
│   ├── cosmos.ts                # Cosmos client setup
│   ├── azure.ts                 # Blob storage & SAS
│   ├── email.ts                 # Email service
│   ├── firebase.ts              # Client Firebase config
│   ├── firebase-admin.ts        # Server auth
│   └── schemas.ts               # Zod validation
└── public/                       # Static assets
```

## � Common Issues & Troubleshooting

### Email Not Sending
- Verify `COMMUNICATION_SERVICES_CONNECTION_STRING` is correctly set
- Check `SENDER_EMAIL_ADDRESS` starts with `DoNotReply@` for Azure Managed Domains
- Ensure `sendConfirmationEmail` is enabled for the event (check admin panel)
- If using Azure Functions, verify `AZURE_EMAIL_FUNCTION_URL` is accessible

### Registration Button Not Activating
- All required fields must be filled
- Email fields automatically trim spaces on blur
- Payment proof required for non-free events
- Check browser console for validation errors

### Firebase Authentication Issues
- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Check `FIREBASE_PRIVATE_KEY` formatting (should include `\n` for newlines)
- Ensure Firebase project has Email/Password authentication enabled
- For admin panel, check if `ADMIN_EMAILS` whitelist includes your email

### Cosmos DB Connection Errors
- Verify `AZURE_COSMOS_CONNECTION_STRING` is correct
- Database and container are auto-created on first run
- Check Azure Cosmos DB firewall settings allow your deployment IP

### File Upload Failures
- Verify `AZURE_STORAGE_CONNECTION_STRING` is set
- Check file size is under 5MB
- Ensure file is a valid image format (JPEG, PNG, WebP, GIF)
- Container `uploads` is auto-created if it doesn't exist

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards
- Follow TypeScript best practices
- Use ESLint configuration provided
- Ensure all types are properly defined
- Add comments for complex logic
- Test thoroughly before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for **TechXPO 2026** by [TechnoJam](https://github.com/technojam)
- Powered by [Next.js](https://nextjs.org/), [Azure](https://azure.microsoft.com/), and [Firebase](https://firebase.google.com/)

## 📧 Support

For issues and questions:
- Open an [Issue](https://github.com/technojam/TechXPO-Registration/issues)
- Check the [Troubleshooting](#common-issues--troubleshooting) section

---

**Made with ❤️ for the tech community**
