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
  PrivacyNotice,
  AdminLayout,
  AdminPeoplePage,
  AdminCampaignsPage,
  AdminGroupPage,
  SignInPage,
  JoinPage
} from 'features/user-management';
import { QuestProvider } from 'features/campaign-entities';
import { NoteProvider, UsageProvider } from 'features/collaboration';
import { QuickAddProvider } from 'shared/context/QuickAddContext';
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
import { QuestsPage, QuestCreatePage, QuestDetailPage } from 'pages/quests';
import { NPCsPage, NPCsCreatePage, NPCDetailPage } from 'pages/npcs';
import { LocationsPage, LocationCreatePage, LocationDetailPage } from 'pages/locations';
import { RumorsPage, RumorCreatePage } from 'pages/rumors';
import EditRouteRedirect from 'app/EditRouteRedirect';
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
                            {/* Inside every entity provider: the quick-add form
                                calls their write methods. */}
                            <QuickAddProvider>
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
                                  {/* Retired in `15-8`. The record is where
                                      editing happens now; the URL still
                                      resolves, because it is in histories and
                                      in notes. */}
                                  <Route
                                    path="/quests/edit/:questId"
                                    element={
                                      <EditRouteRedirect
                                        param="questId"
                                        destination={(id) => `/quests/${id}`}
                                        fallback="/quests"
                                      />
                                    }
                                  />
                                  {/* After the two literal segments, so
                                      `/quests/create` and `/quests/edit/x` keep
                                      their own pages rather than being read as
                                      a quest id. */}
                                  <Route path="/quests/:questId" element={<QuestDetailPage />} />
                                  <Route path="/npcs" element={<NPCsPage />} />
                                  <Route path="/npcs/create" element={<NPCsCreatePage />} />
                                  <Route
                                    path="/npcs/edit/:npcId"
                                    element={
                                      <EditRouteRedirect
                                        param="npcId"
                                        destination={(id) => `/npcs/${id}`}
                                        fallback="/npcs"
                                      />
                                    }
                                  />
                                  <Route path="/npcs/:npcId" element={<NPCDetailPage />} />
                                  <Route path="/locations" element={<LocationsPage />} />
                                  <Route path="/locations/create" element={<LocationCreatePage />} />
                                  <Route
                                    path="/locations/edit/:locationId"
                                    element={
                                      <EditRouteRedirect
                                        param="locationId"
                                        destination={(id) => `/locations/${id}`}
                                        fallback="/locations"
                                      />
                                    }
                                  />
                                  {/* After the two literal segments, so
                                      `/locations/create` and `/locations/edit/x`
                                      keep their own pages rather than being read
                                      as a location id. */}
                                  <Route path="/locations/:locationId" element={<LocationDetailPage />} />
                                  <Route path="/rumors" element={<RumorsPage />} />
                                  <Route path="/rumors/create" element={<RumorCreatePage />} />
                                  {/* A rumour has no page by design (§2.1),
                                      so its old edit URL goes to the row:
                                      `?highlight=` opens it in place. */}
                                  <Route
                                    path="/rumors/edit/:rumorId"
                                    element={
                                      <EditRouteRedirect
                                        param="rumorId"
                                        destination={(id) => `/rumors?highlight=${id}`}
                                        fallback="/rumors"
                                      />
                                    }
                                  />
                                  <Route path="/notes" element={<NotesPage />} />
                                  <Route path="/notes/:noteId" element={<NotePage />} />
                                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                                  <Route path="/contact" element={<ContactPage />} />
                                  <Route path="/profile" element={<ProfilePage />} />
                                  {/* Admin and auth are places, not decisions
                                      taken about the page behind them, so they
                                      are routes. `AdminLayout` owns the band,
                                      the sub-navigation and the three states
                                      that decide whether any of it renders. */}
                                  <Route path="/admin" element={<AdminLayout />}>
                                    <Route index element={<Navigate to="/admin/people" replace />} />
                                    {/* Absolute child paths, which React Router
                                        allows where they extend the parent's:
                                        the route table then reads as the URLs
                                        people actually visit. */}
                                    <Route path="/admin/people" element={<AdminPeoplePage />} />
                                    <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
                                    <Route path="/admin/group" element={<AdminGroupPage />} />
                                  </Route>
                                  <Route path="/signin" element={<SignInPage />} />
                                  <Route path="/join" element={<JoinPage />} />
                                </Routes>
                              </Layout>
                            </QuickAddProvider>
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