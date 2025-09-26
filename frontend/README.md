# 🖼️ RezGenie Frontend

Next.js-based frontend for the RezGenie AI-powered resume optimization platform.

## ✨ Features

- **Smart Resume Analysis** - Upload and analyze resumes with AI insights  
- **Job Matching Analytics** - Compare resumes against job descriptions with similarity scores
- **Genie Wishes System** - Daily personalized recommendations for resume improvement
- **Career Guidance Hub** - Comprehensive guides for resume optimization and job search
- **Professional UI/UX** - Consistent design system with purple theme branding
- **Dark/Light Mode** - Beautiful theme switching with seamless transitions
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Authentication System** - Secure user registration and login functionality

## 🚀 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom purple theme
- **Components**: shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Themes**: next-themes for dark/light mode

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:

```bash
git clone https://github.com/RezGenie/RezGenie.git
cd RezGenie/frontend
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🎨 Design System

RezGenie uses a custom purple-themed design system with:

- **Primary Colors**: Purple gradients (oklch color space)
- **Typography**: Inter font family
- **Components**: Consistent shadcn/ui components
- **Animations**: Subtle Framer Motion effects
- **Responsive**: Mobile-first approach

## 🧭 Application Routes

### ✅ Completed Pages

- **`/`** - Landing page with hero section, features overview, and call-to-action
- **`/auth`** - Authentication page with login/signup forms
- **`/dashboard`** - User dashboard with stats, activity, and personalized content
- **`/genie`** - AI genie wishes interface with resume upload and job posting analysis
- **`/opportunities`** - Job opportunities page with matching and filtering (renamed from `/compare`)
- **`/guides`** - Career guidance hub with comprehensive resources
  - **`/guides/optimizing-resume`** - Resume optimization strategies and tips
  - **`/guides/genie-wishes`** - How to maximize AI recommendations
  - **`/guides/get-more-interviews`** - Interview acquisition tactics
- **`/contact`** - Contact information and team details
- **`/pricing`** - Pricing plans and subscription options
- **`/privacy`** - Privacy policy and data handling information
- **`/terms`** - Terms of service and user agreements
- **`/profile`** - User profile management and settings

### 🎨 Design System Features

- **Consistent Typography** - Unified title sizing across all pages (`text-3xl md:text-4xl lg:text-5xl`)
- **Professional Color Scheme** - Purple gradient theme with proper dark/light mode support
- **Responsive Navigation** - Mobile-friendly header with authentication state handling
- **Smooth Animations** - Framer Motion transitions throughout the application
- **Component Library** - Full shadcn/ui integration with custom theming
- **Protected Routes** - Middleware-based authentication for sensitive pages

## 📁 Project Structure

```plaintext
src/
├── app/                   # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── contact/           # Contact and team information
│   ├── dashboard/         # User dashboard
│   ├── genie/             # AI genie interface
│   ├── guides/            # Career guidance hub
│   │   ├── get-more-interviews/
│   │   ├── genie-wishes/
│   │   └── optimizing-resume/
│   ├── opportunities/     # Job matching and opportunities
│   ├── pricing/           # Pricing plans
│   ├── privacy/           # Privacy policy
│   ├── profile/           # User profile management
│   ├── terms/             # Terms of service
│   ├── globals.css        # Global styles and theme variables
│   ├── layout.tsx         # Root layout with providers
│   ├── middleware.ts      # Route protection and authentication
│   ├── not-found.tsx      # 404 error page
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # shadcn/ui component library
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── sonner.tsx
│   │   └── textarea.tsx
│   ├── footer.tsx         # Application footer
│   ├── header.tsx         # Navigation header with auth
│   ├── ProtectedRoute.tsx # Route protection wrapper
│   └── theme-toggle.tsx   # Dark/light mode toggle
├── contexts/
│   └── AuthContext.tsx    # Authentication context provider
├── lib/
│   ├── api.ts             # API client and types
│   └── utils.ts           # Utility functions
└── types/
    └── index.ts           # TypeScript type definitions
```

## 🔧 Available Scripts

- `dev` - Start development server with Turbopack
- `build` - Build production application
- `start` - Start production server
- `lint` - Run ESLint
- `type-check` - Run TypeScript compiler

## 🌟 Key Components & Features

### ✅ Header Navigation

- **Responsive Design** - Mobile-friendly navigation with hamburger menu
- **Authentication Integration** - Dynamic user state with login/logout functionality
- **Theme Toggle** - Seamless dark/light mode switching
- **Professional Branding** - RezGenie logo with genie emoji
- **Route Protection** - Authenticated vs public navigation states

### ✅ Landing Page

- **Hero Section** - Engaging introduction with animated genie emoji
- **Features Grid** - Interactive cards showcasing AI capabilities
- **Responsive Layout** - Optimized spacing and typography across devices
- **Call-to-Action** - Clear user journey to main application

### ✅ Authentication System

- **Login/Register Forms** - Clean forms with validation
- **JWT Token Management** - Secure authentication flow
- **Protected Routes** - Middleware-based route protection
- **User Context** - Global authentication state management

### ✅ AI Genie Interface

- **File Upload** - Drag & drop resume upload with validation
- **Job Posting Input** - Textarea for job description analysis
- **Wish Counter** - Daily usage tracking with visual feedback
- **Analysis Results** - Comprehensive AI insights display

### ✅ Career Guides Hub

- **Guide Categories** - Organized career guidance content
- **Interactive Cards** - Colorful, engaging guide previews
- **Detailed Content** - Comprehensive guides with actionable tips
- **Cross-linking** - Internal navigation between related guides

### ✅ User Dashboard

- **Personal Stats** - Profile completion and activity tracking
- **Recent Activity** - Timeline of user interactions
- **Quick Actions** - Easy access to main features
- **Personalized Content** - User-specific recommendations

### ✅ Theme System

- **Dark/Light Mode** - Complete theme switching with system preference detection
- **Purple Color Palette** - Professional gradient color scheme
- **Consistent Typography** - Unified text sizing and spacing
- **✅No Flash Effect** - Smooth theme transitions without content flash

## 📱 Responsive Design

RezGenie is fully responsive with breakpoints:

- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

## 🎯 Development Status

### ✅ Completed Features

- [x] **Authentication System** - Login/register pages with JWT integration
- [x] **Resume Upload Interface** - Drag-and-drop functionality with file validation
- [x] **Job Comparison Dashboard** - Opportunities page with matching algorithms
- [x] **AI Analysis Results Display** - Comprehensive insights and recommendations
- [x] **User Profile Management** - Profile editing and account management
- [x] **Career Guidance System** - Complete guides hub with detailed content
- [x] **Responsive Design** - Mobile-first approach with consistent theming
- [x] **Route Protection** - Middleware-based authentication for sensitive routes
- [x] **Professional UI** - shadcn/ui components with custom purple theme
- [x] **Dark/Light Mode** - System-aware theme switching

### 🚧 Future Enhancements

- [ ] Real-time AI analysis with streaming responses
- [ ] Advanced filtering and search in opportunities
- [ ] User preferences and notification settings
- [ ] Resume version history and comparison
- [ ] Integration with job board APIs
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Mobile app development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

For more help, check the logs or create an issue in the repository.
