// src/app/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NavigationProvider } from 'shared/context/NavigationContext';
import { SearchProvider } from 'shared/context/SearchContext';
import { NPCProvider, LocationProvider, RumorProvider } from 'features/campaign-entities';
import { StoryProvider } from 'features/storytelling';
import {
  FirebaseProvider,
  SessionTimeoutWarning,
  SessionManager,
  PrivacyNotice
} from 'features/user-management';
import { QuestProvider } from 'features/campaign-entities';
import { NoteProvider, UsageProvider } from 'features/collaboration';
import ErrorBoundary from 'shared/components/ErrorBoundary';
import Layout from 'app/layout/Layout';

// Import pages
import HomePage from 'pages/HomePage';
import {
  StoryPage,
  SagaPage,
  SagaEditPage,
  ChaptersPage,
  ChapterCreatePage,
  ChapterEditPage
} from 'pages/story';
import { QuestsPage, QuestCreatePage, QuestEditPage } from 'pages/quests';
import { NPCsPage, NPCsCreatePage, NPCsEditPage } from 'pages/npcs';
import { LocationsPage, LocationCreatePage, LocationEditPage } from 'pages/locations';
import { RumorsPage, RumorCreatePage, RumorEditPage } from 'pages/rumors';
import { NotesPage, NotePage } from 'pages/notes';
import PrivacyPolicyPage from 'pages/PrivacyPolicyPage';
import ContactPage from 'pages/ContactPage';
import { ProfilePage } from 'pages/profile';

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
                        <UsageProvider>
                          <SearchProvider>
                            <Layout>
                              <SessionTimeoutWarning />
                              <PrivacyNotice />
                              <Routes>
                                <Route path="/" element={<HomePage />} />
                                {/* `/story` is now the chapters index; the old dedicated
                                    selection page is gone (see git history for
                                    StorySelectionPage). `/story/selection` redirects so
                                    existing bookmarks don't 404. */}
                                <Route path="/story" element={<ChaptersPage />} />
                                <Route path="/story/selection" element={<Navigate to="/story" replace />} />
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
                                <Route path="/profile" element={<ProfilePage />} />
                              </Routes>
                            </Layout>
                          </SearchProvider>
                        </UsageProvider>
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