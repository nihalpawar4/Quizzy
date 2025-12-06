# Quizy - Academic Testing Platform

A comprehensive, production-ready academic testing platform built with Next.js 14, designed for students (Class 5-10) and teachers following the "Zen Academic" design philosophy.

![Quizy Platform](./docs/preview.png)

## ✨ Features

### For Students
- **Smart Test Filtering**: Only see tests relevant to your class level
- **Distraction-free Testing**: Zen mode fades out UI elements during tests
- **One Question at a Time**: Smooth slide transitions between questions
- **Instant Results**: Immediate feedback with animated circular progress
- **Progress Tracking**: View your test history and average scores

### For Teachers
- **Analytics Dashboard**: Clean, data-dense tables showing all student results
- **CSV Export**: Download reports for Excel/Google Sheets analysis
- **Smart Question Upload**: Bulk upload questions via CSV or JSON
- **Test Management**: Create, edit, and manage tests with ease
- **Class-based Organization**: Target specific classes for each test

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Backend**: Firebase (Authentication & Firestore)
- **Icons**: Lucide React

## 📁 Project Structure

```
quizy-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── auth/
│   │   │   ├── login/          # Login page
│   │   │   └── register/       # Registration page
│   │   ├── dashboard/
│   │   │   ├── student/        # Student dashboard
│   │   │   └── teacher/        # Teacher dashboard
│   │   └── test/
│   │       └── [id]/           # Test-taking interface
│   ├── components/
│   │   └── teacher/
│   │       └── SmartUpload.tsx # CSV/JSON question upload
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state management
│   ├── lib/
│   │   ├── firebase.ts         # Firebase configuration
│   │   ├── services.ts         # Firestore operations
│   │   ├── constants.ts        # App constants
│   │   └── utils/
│   │       ├── downloadCSV.ts  # CSV export utility
│   │       └── parseQuestions.ts # Question parsing utilities
│   └── types/
│       └── index.ts            # TypeScript definitions
└── .env.example                # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quizy-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up Firestore**
   
   Create the following indexes in Firestore:
   - Collection: `tests` - Index on `targetClass` (Asc), `isActive` (Asc), `createdAt` (Desc)
   - Collection: `questions` - Index on `testId` (Asc), `order` (Asc)
   - Collection: `results` - Index on `studentId` (Asc), `timestamp` (Desc)

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 👤 User Roles

### Students
- Register with email, password, name, and class selection (5-10)
- Access only tests designed for their class
- Take tests with a distraction-free interface
- View instant results and test history

### Teachers
- Register with admin email or admin code (`QUIZY_ADMIN_2024`)
- Default admin emails: `admin@quizy.com`, `teacher@quizy.com`
- Create and manage tests for specific classes
- Upload questions in bulk (CSV or JSON)
- View analytics and download reports

## 📤 Smart Upload Formats

### CSV Format
```csv
Question,Option A,Option B,Option C,Option D,Correct Answer
"What is 2 + 2?",3,4,5,6,B
"Capital of France?",London,Paris,Berlin,Rome,B
```

### JSON Format
```json
[
  {
    "question": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": 1
  },
  {
    "question": "Capital of France?",
    "options": ["London", "Paris", "Berlin", "Rome"],
    "correctAnswer": "B"
  }
]
```

**Supported correct answer formats:**
- Letters: A, B, C, D
- Numbers: 0, 1, 2, 3 (0-indexed) or 1, 2, 3, 4 (1-indexed)
- Option text: The exact text of the correct option

## 📊 Database Schema

### Collections

**users**
```typescript
{
  uid: string;
  email: string;
  name: string;
  role: 'student' | 'teacher';
  studentClass?: number; // 5-10
  createdAt: Timestamp;
}
```

**tests**
```typescript
{
  id: string;
  title: string;
  subject: string;
  targetClass: number;
  createdBy: string;
  createdAt: Timestamp;
  questionCount?: number;
  duration?: number;
  isActive: boolean;
}
```

**questions**
```typescript
{
  id: string;
  testId: string;
  text: string;
  options: string[];
  correctOption: number;
  order?: number;
}
```

**results**
```typescript
{
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentClass: number;
  testId: string;
  testTitle: string;
  subject: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  timestamp: Timestamp;
}
```

## 🎨 Design Philosophy

**"Zen Academic"** - A minimalist, distraction-free approach to educational software:

- **Landing Page**: Clean hero section with bold headline, minimal navigation
- **Student UI**: Focus mode during tests - UI fades to highlight questions
- **Teacher UI**: Data-dense but organized tables with clear visual hierarchy
- **Animations**: Subtle, purposeful Framer Motion transitions
- **Colors**: Professional indigo/purple gradient accents on clean backgrounds

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for educators and students
