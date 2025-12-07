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



## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️By Nihal pawar for educators and students
