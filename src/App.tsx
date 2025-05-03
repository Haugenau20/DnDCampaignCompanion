// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { NavigationProvider } from './context/NavigationContext';
import { SearchProvider } from './context/SearchContext';
import { NPCProvider } from './context/NPCContext';
import { StoryProvider } from './context/StoryContext';
import { LocationProvider } from './context/LocationContext';
import { FirebaseProvider } from './context/firebase/FirebaseContext';
import { RumorProvider } from './context/RumorContext';
import { QuestProvider } from './context/QuestContext';
import { NoteProvider } from './context/NoteContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Layout from './components/layout/Layout';
import SessionTimeoutWarning from './components/features/auth/SessionTimeoutWarning';
import SessionManager from './components/features/auth/SessionManager';
import PrivacyNotice from './components/features/auth/PrivacyNotice';

// Import pages
import HomePage from './pages/HomePage';
import { 
  StorySelectionPage, 
  StoryPage, 
  SagaPage,
  SagaEditPage, 
  ChaptersPage,
  ChapterCreatePage, 
  ChapterEditPage 
} from './pages/story';
import { QuestsPage, QuestCreatePage, QuestEditPage } from './pages/quests';
import { NPCsPage, NPCsCreatePage, NPCsEditPage } from './pages/npcs';
import { LocationsPage, LocationCreatePage, LocationEditPage } from './pages/locations';
import { RumorsPage, RumorCreatePage, RumorEditPage } from './pages/rumors';
import { NotesPage, NotePage } from './pages/notes';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ContactPage from './pages/ContactPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <SessionManager>
          <NavigationProvider>
            <NPCProvider>
              <LocationProvider>
                <StoryProvider>
                  <RumorProvider>
                    <QuestProvider>
                      <NoteProvider>
                        <SearchProvider>
                          <Layout>
                            <SessionTimeoutWarning />
                            <PrivacyNotice />
                            <Routes>
                              <Route path="/" element={<HomePage />} />
                              <Route path="/story" element={<StorySelectionPage />} />
                              <Route path="/story/chapters" element={<ChaptersPage />} />
                              <Route path="/story/chapters/:chapterId" element={<StoryPage />} />
                              <Route path="/story/saga" element={<SagaPage />} />
                              <Route path="/story/saga/edit" element={<SagaEditPage />} />
                              <Route path="/story/chapters/create" element={<ChapterCreatePage />} />
                              <Route path="/story/chapters/edit/:chapterId" element={<ChapterEditPage />} />
                              <Route path="/quests" element={<QuestsPage />} />
                              <Route path="/quests/create" element={<QuestCreatePage />} />
                              <Route path="/quests/edit/:questId" element={<QuestEditPage />} />
                              <Route path="/npcs" element={<NPCsPage />} />
                              <Route path="/npcs/create" element={<NPCsCreatePage />} />
                              <Route path="/npcs/edit/:npcId" element={<NPCsEditPage />} />
                              <Route path="/locations" element={<LocationsPage />} />
                              <Route path="/locations/create" element={<LocationCreatePage />} />
                              <Route path="/locations/edit/:locationId" element={<LocationEditPage />} />
                              <Route path="/rumors" element={<RumorsPage />} />
                              <Route path="/rumors/create" element={<RumorCreatePage />} />
                              <Route path="/rumors/edit/:rumorId" element={<RumorEditPage />} />
                              <Route path="/notes" element={<NotesPage />} />
                              <Route path="/notes/:noteId" element={<NotePage />} />
                              <Route path="/privacy" element={<PrivacyPolicyPage />} />
                              <Route path="/contact" element={<ContactPage />} />
                            </Routes>
                          </Layout>
                        </SearchProvider>
                      </NoteProvider>
                    </QuestProvider>
                  </RumorProvider>
                </StoryProvider>
              </LocationProvider>
            </NPCProvider>
          </NavigationProvider>
        </SessionManager>
      </FirebaseProvider>
    </ErrorBoundary>
  );
};

export default App;