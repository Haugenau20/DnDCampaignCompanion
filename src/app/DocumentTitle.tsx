// src/app/DocumentTitle.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, useCampaigns } from 'features/user-management';
import type { AnalyticsPage } from 'core/services/firebase/analytics/analytics';

/** The site's name, last in every tab title. */
export const SITE_NAME = 'Muninn';

/** What separates the parts of a tab title. */
export const TITLE_SEPARATOR = ' · ';

interface Section {
  /** The first path segment(s) the section owns, e.g. `/npcs`. */
  prefix: string;
  /** The section's name in a tab title. Matches the navigation's labels. */
  page: string;
  /** Whether the section shows one campaign's records, so names it. */
  campaign: boolean;
}

/**
 * Every section, by the address it lives at. A record's page takes its
 * section's name ("Quests" for `/quests/the-lost-mine`), as do create and
 * edit pages.
 *
 * Kept beside the route table in `App.tsx`: a route added there without an
 * entry here gets the bare title, never a wrong one.
 */
const SECTIONS: readonly Section[] = [
  { prefix: '/story', page: 'Story', campaign: true },
  { prefix: '/quests', page: 'Quests', campaign: true },
  { prefix: '/rumors', page: 'Rumours', campaign: true },
  { prefix: '/npcs', page: 'NPCs', campaign: true },
  { prefix: '/locations', page: 'Locations', campaign: true },
  { prefix: '/notes', page: 'Notes', campaign: true },
  { prefix: '/profile', page: 'Profile', campaign: false },
  { prefix: '/admin', page: 'Admin', campaign: false },
  { prefix: '/signin', page: 'Sign in', campaign: false },
  { prefix: '/auth/link', page: 'Sign in', campaign: false },
  { prefix: '/join', page: 'Join', campaign: false },
  { prefix: '/privacy', page: 'Privacy', campaign: false },
  { prefix: '/contact', page: 'Contact', campaign: false },
  { prefix: '/about', page: 'About', campaign: false },
];

/** The section an address belongs to, if any. */
const sectionFor = (pathname: string): Section | undefined =>
  SECTIONS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * What Google Analytics is told about an address (T138): its section and
 * nothing else. The address itself can hold a record's name, an invitation
 * code or a sign-in link's code, and the tab title names the campaign.
 *
 * @param pathname - the address's path
 */
export const analyticsPageFor = (pathname: string): AnalyticsPage => {
  if (pathname === '/') {
    return { path: '/', title: 'Home' };
  }
  const section = sectionFor(pathname);
  return section
    ? { path: section.prefix, title: section.page }
    : { path: '/other', title: 'Other' };
};

/**
 * The tab title for an address: `{Page} · {Campaign} · Muninn`, leaving out
 * whatever does not apply. "Quests · The Sunless Citadel · Muninn",
 * "Profile · Muninn", and on the home page the campaign alone, or just
 * "Muninn" when signed out.
 *
 * @param pathname - the address's path
 * @param campaignName - the active campaign's name, if there is one
 */
export const documentTitleFor = (pathname: string, campaignName?: string | null): string => {
  const section = sectionFor(pathname);
  const isHome = pathname === '/';
  const namesCampaign = isHome || (section?.campaign ?? false);

  return [section?.page, namesCampaign ? campaignName : undefined, SITE_NAME]
    .filter((part): part is string => Boolean(part))
    .join(TITLE_SEPARATOR);
};

/**
 * Keeps `document.title` in step with the address and the active campaign.
 * Renders nothing.
 */
const DocumentTitle: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { activeCampaign } = useCampaigns();
  // A campaign left over from a previous session is not named to whoever
  // signed out.
  const campaignName = user ? activeCampaign?.name : undefined;

  useEffect(() => {
    document.title = documentTitleFor(pathname, campaignName);
  }, [pathname, campaignName]);

  return null;
};

export default DocumentTitle;
