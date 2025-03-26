# D&D Campaign Companion

## 📖 Overview

D&D Campaign Companion is a comprehensive web application designed to help players track and organize their Dungeons & Dragons campaigns. This fully-featured React application provides intuitive tools for managing campaign stories, quests, rumors, NPCs, and locations - all with a themed interface that enhances the D&D experience.

### 🔗 [Live Demo](https://dnd-campaign-companion.web.app/) | [Repository](https://github.com/haugenau20/DnDCampaignCompanion)

## ✨ Features

### 📚 Story Management
- **Book-like Reading Experience**: Navigate through your campaign story with an intuitive interface
- **Chapter Management**: Organize story content into chapters with easy navigation
- **Reading Progress Tracking**: Automatically save reading progress and resume where you left off
- **Two Reading Modes**: Choose between session-by-session chapters or a continuous saga format

### 🏆 Quest Tracking
- **Quest Management**: Create, edit, and organize campaign quests
- **Objective Tracking**: Track completion status of individual quest objectives
- **Quest Details**: Store comprehensive information including locations, NPCs, rewards, and complications
- **Status Indicators**: Visualize quest progress with clear status indicators

### 👥 NPC Directory
- **Character Profiles**: Maintain detailed NPC profiles including appearance, personality, and background
- **Relationship Tracking**: Track NPC relationships to the party and other characters
- **Status Management**: Track NPC status (alive, deceased, missing)
- **Quick Notes**: Add session notes to keep character information up to date

### 🗺️ Location Management
- **Hierarchical Organization**: Organize locations with parent-child relationships
- **Location Details**: Store comprehensive location information including description, features, and points of interest
- **Connected Information**: Link locations to related NPCs and quests
- **Discovery Status**: Track location discovery status (known, explored, visited)

### Rumor Tracking
- **Rumor Management**: Create, edit, and organize campaign rumors
- **Status Tracking**: Track the state of the rumor to see if it is confirmed, unconfirmed or false
- **Combine and Convert**: Combine several rumors or convert them into a quest

### 🔍 Global Search (🚧 Under construction)
- **Cross-section Search**: Find content across stories, quests, NPCs, and locations
- **Real-time Results**: Get instant search results with highlighted matching terms
- **Contextual Navigation**: Jump directly to search results with proper context

### 🎨 Themed Interface
- **Medieval Theme**: Immersive interface with thematic elements
- **Responsive Design**: Fully responsive layout that works on devices of all sizes (🚧 Under construction)
- **Dark/Light Mode**: Choose between different visual themes

## 🛠️ Technical Implementation

### Architecture

The D&D Campaign Companion is built with a component-based architecture following modern React best practices:

- **React with TypeScript**: Type-safe code with React's component-based architecture
- **React Router**: Client-side routing for seamless navigation
- **Context API**: State management using React's Context API
- **Firebase Integration**: Data storage and authentication using Firebase
- **Custom Hooks**: Specialized hooks for data fetching, search, and navigation

### Frontend Technologies

- **React 18**: Latest React features for optimal performance
- **TypeScript**: Strong typing for better developer experience and code quality
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide Icons**: Beautiful, consistent icon set

### State Management

- **React Context API**: App-wide state management for consistent data access
- **Custom Hooks**: Specialized hooks for data fetching and management
- **Optimistic UI Updates**: Immediate UI feedback with background synchronization

### Data Flow

- **Firebase Firestore**: Real-time database for storing campaign data
- **Authentication**: Secure content editing with Firebase Authentication

### Performance Optimizations

- **Code Splitting**: Route-based code splitting for faster initial load
- **Memoization**: React.memo and useMemo for preventing unnecessary renders
- **Optimized Search**: Efficient client-side search implementation
- **Lazy Loading**: Components and routes loaded only when needed

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn

### Installation

(🚧 Coming soon)

### Firebase Configuration

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Firestore Database and Authentication
3. Add your Firebase configuration in `src/services/firebase/FirebaseService.ts`

## 📁 Project Structure

```
DnDCampaignCompanion/
├── src/
│   ├── components/     # UI components
│   │   ├── core/       # Core UI components (Button, Card, etc.)
│   │   ├── features/   # Feature-specific components
│   │   ├── layout/     # Layout components (Header, Footer, etc.)
│   │   └── shared/     # Shared utility components
│   ├── context/        # React Context definitions
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # Service integrations (Firebase, etc.)
│   ├── styles/         # Global styles and theme definitions
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── public/             # Static assets
└── ...                 # Configuration files
```

## 📦 Deployment

The application is configured for automatic deployment to Firebase Hosting using GitHub Actions:

1. Push changes to the main branch
2. GitHub Actions automatically builds and deploys the application
3. Visit the deployed application at https://dnd-campaign-companion.web.app/

## 🚧 Project Status
This project is currently under active development and updates are being made regularly. The search functionality and several other features are still being built and refined.

## 🤝 Contributing
As the project is in active development, please reach out before making contributions. If you're interested in contributing or have suggestions, feel free to:

1. Open an issue to discuss your ideas
2. Star the repository to show your interest
3. Fork the repository if you'd like to experiment with the code

Once the project reaches a more stable state, formal contribution guidelines will be established.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Søren Haug**
- GitHub: [@haugenau20](https://github.com/haugenau20)
- LinkedIn: [Søren Haug](https://www.linkedin.com/in/s%C3%B8ren-kj%C3%A6degaard-haug-0723855a/)

## 🙏 Acknowledgements

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- All the D&D enthusiasts who provided feedback and suggestions