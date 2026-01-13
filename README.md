# 🔑 Key Club Web Application

A modern web application for managing Key Club events, hours, announcements, and member information. Converted from React Native to a full-stack web application.

## ✨ Features

- 👥 **Student & Admin Authentication** - Secure login system with role-based access
- 📅 **Event Management** - Create, view, and register for club events
- ⏰ **Hour Tracking** - Submit and manage service hour requests
- 📢 **Announcements** - Stay updated with club news and updates
- 👨‍💼 **Officer Directory** - View club leadership information
- 📊 **Meeting Attendance** - Track attendance at club meetings
- 📰 **Newsletters** - Access club newsletters and publications
- 🔐 **Admin Dashboard** - Comprehensive management tools for administrators

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL database + Auth)
- **State Management**: React Context API
- **Form Handling**: Native HTML5 forms

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account (for backend)

### Setup Steps

1. **Clone the repository** (if not already done)
   ```bash
   cd /Users/parthzanwar/Desktop/key-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Optional: override the proof upload endpoint if you are not using Netlify dev server
   # VITE_UPLOAD_PROOF_ENDPOINT=http://localhost:8888/.netlify/functions/upload-proof
   ```

   Get these values from your [Supabase Dashboard](https://app.supabase.com) → Project Settings → API

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will open at `http://localhost:3000`

5. **Build for production**
   ```bash
   npm run build
   ```

   Production files will be in the `dist/` directory

## 📁 Project Structure

```
key-website/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React Context providers (Auth, Events, Hours, Modal)
│   ├── router/              # React Router configuration
│   ├── screens/             # Page components
│   ├── services/            # API services (Supabase)
│   ├── styles/              # Global CSS and Tailwind config
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
│   ├── assets/              # Images, fonts, etc.
│   └── newsletters/         # Newsletter PDFs
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## 🔄 Conversion Status

### ✅ Completed
- [x] Build system (Vite + TypeScript)
- [x] Backend services (Supabase with Web Crypto)
- [x] Context providers (Auth, Events, Hours, Modal)
- [x] Routing system (React Router)
- [x] Core components (LoadingScreen, etc.)
- [x] Example screens (LandingScreen converted)

### 🚧 In Progress
- [ ] Converting remaining screens (25+ screens)
- [ ] UI components (modals, forms, etc.)
- [ ] Responsive design optimization

### 📋 Screens to Convert

See `WEB_CONVERSION_GUIDE.md` for detailed conversion instructions.

**Priority High:**
- Auth screens (Login, Registration, etc.)
- Home screen
- Calendar screen
- Announcements screen

**Priority Medium:**
- Event management screens
- Hour tracking screens
- Admin screens

**Priority Low:**
- Auxiliary screens (Contact, Social Media, etc.)

## 🎨 Styling Guide

The application uses Tailwind CSS for styling. Key classes:

```tsx
// Layout
<div className="flex flex-col items-center justify-center min-h-screen">

// Buttons
<button className="btn btn-primary">Click Me</button>

// Cards
<div className="card">Content</div>

// Colors
className="bg-primary text-white"      // Navy blue background
className="bg-secondary text-gray-800" // Light blue background
className="bg-accent text-white"       // Accent blue
```

Custom classes are defined in `src/styles/index.css`.

## 🔐 Authentication

### Student Login
- S-Number format: `s` followed by numbers (e.g., `s123456`)
- Password must be at least 6 characters

### Admin Login (Default for Development)
- Email: `admin@example.com`
- Password: `password`

**⚠️ Important**: Change admin credentials in production!

## 📂 Google Drive Proof Uploads

Hour request proof photos are automatically pushed to the Key Club Google Drive when an admin approves a request. This flow is powered by a Netlify Function and a Google service account with Drive access.

### Required Netlify environment variables

Set the following in your Netlify site settings (Site configuration → Environment variables):

| Variable | Description |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email with Drive access |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Private key for the service account (JSON `private_key` value) |
| `GOOGLE_DRIVE_FOLDER_ID` | Folder ID where proof photos should be stored |

> ⚠️ When pasting the private key, keep it in one line and Netlify will handle the `\n` characters.

### Local development

If you run the app with `netlify dev`, the serverless function is available at `/.netlify/functions/upload-proof`. If you prefer running `npm run dev`, set `VITE_UPLOAD_PROOF_ENDPOINT` to a fully-qualified URL pointing at the Netlify dev server so the browser can reach the function.

### Error handling

- If the Google Drive upload fails, the admin approval still succeeds and a warning is logged in the browser console.
- The Netlify Function returns the Drive file ID and share link in case you need to extend the workflow later.

## 📊 Database Schema

The application uses Supabase with the following main tables:

- `students` - Student information and hours
- `auth_users` - Authentication credentials
- `events` - Club events
- `event_attendees` - Event registrations
- `hour_requests` - Service hour submissions
- `meetings` - Club meetings
- `meeting_attendance` - Meeting attendance records
- `announcements` - Club announcements
- `support_questions` - Help desk inquiries

See `database_schema.sql` for complete schema.

### Performance Optimization

**⚠️ CRITICAL: If you're experiencing loading issues or timeout errors:**

1. **Apply Database Indexes** (most important!):
   - Go to your Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `scripts/add_performance_indexes.sql`
   - Run the script to create necessary indexes
   - These indexes are critical for query performance

2. **See `LOADING_OPTIMIZATION_GUIDE.md`** for:
   - Complete optimization checklist
   - Troubleshooting slow queries
   - Additional performance tips
   - Monitoring and debugging

**Already Optimized:**
- ✅ AdminHourManagementScreen now uses cached context data (avoids redundant queries)
- ✅ Timeout error handling with graceful fallbacks
- ✅ Query limits to prevent large result sets
- ✅ Optimized column selection (not selecting all columns)

## 🚀 Deployment

### Netlify (Recommended)

1. Connect your repository to Netlify
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in Netlify dashboard
4. Deploy!

### Vercel

1. Import your repository to Vercel
2. Framework preset: Vite
3. Add environment variables
4. Deploy!

### Manual Deployment

```bash
# Build the app
npm run build

# Deploy the 'dist' folder to your hosting provider
```

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 Development Notes

### Converting Screens from React Native

When converting screens:

1. Replace React Native components:
   - `<View>` → `<div>`
   - `<Text>` → `<span>`, `<p>`, `<h1>`, etc.
   - `<TouchableOpacity>` → `<button>`
   - `<ScrollView>` → `<div>` with overflow

2. Update navigation:
   ```tsx
   // Before (React Native)
   navigation.navigate('ScreenName')
   
   // After (React Router)
   import { useNavigate } from 'react-router-dom';
   const navigate = useNavigate();
   navigate('/route-path')
   ```

3. Replace styling:
   ```tsx
   // Before
   style={styles.container}
   
   // After
   className="flex flex-col items-center p-4"
   ```

4. Use TypeScript types for props and state

See `WEB_CONVERSION_GUIDE.md` for detailed conversion patterns.

## 🐛 Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
Add `// @ts-ignore` above the line temporarily, then fix properly later

### Supabase connection issues
- Verify your `.env` file has correct credentials
- Check Supabase dashboard for API status
- Ensure your database has the correct schema

### Build errors
```bash
npm run type-check  # Check TypeScript errors
npm run lint        # Check linting errors
```

## 📞 Support

For questions or issues:
1. Check `WEB_CONVERSION_GUIDE.md` for conversion help
2. Review existing code patterns in converted screens
3. Check the Supabase documentation
4. Contact the development team

## 📄 License

This project is private and intended for Cypress Ranch Key Club use only.

## 🙏 Acknowledgments

- Built for Cypress Ranch High School Key Club
- Converted from React Native/Expo to web application
- Backend powered by Supabase
- UI styled with Tailwind CSS

---

**Version**: 2.0.0 (Web)  
**Last Updated**: October 2025

