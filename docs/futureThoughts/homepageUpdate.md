# D&D Campaign Companion - Dashboard Homepage Redesign Specification

## 1. Design Goals & Overview

### 1.1 Primary Goals
- Create a content-focused dashboard view rather than navigation-centric layout
- Reduce duplicate navigation elements
- Provide immediate value through personalized content and campaign information
- Improve usability on various screen sizes
- Maintain visual consistency with the existing theme system

### 1.2 Design Approach
Transform the homepage from a navigation hub into a dashboard that:
- Shows relevant campaign information
- Displays recent activity across content types
- Provides quick stats about campaign progress
- Offers easy access to recently viewed content
- Maintains clear navigation while reducing clutter

## 2. Component Specifications

### 2.1 Header Component

#### 2.1.1 Streamlined Top Navigation Bar
- **Height**: 64px
- **Layout**: Flexbox with space-between alignment
- **Elements**:
  - **Logo** (left-aligned): D&D Campaign Companion text/logo
  - **Search** (center-aligned): Expandable search field with icon, expands on click
  - **Campaign Selector** (right-aligned): Dropdown showing current campaign
  - **User Controls** (far right): User avatar with dropdown menu
  - **Theme Toggle** (adjacent to user controls): Icon button for theme switching

#### 2.1.2 Primary Navigation
- **Height**: 48px
- **Position**: Below top navigation bar
- **Layout**: Horizontal tabs with equal spacing
- **Background**: Use theme's navigation background color
- **Elements**: Story | Quests | Rumors | NPCs | Locations
- **Active State**: Underline or background highlight based on theme
- **Responsive Behavior**: Collapses to hamburger menu on smaller screens (<768px)

### 2.2 Campaign Banner Component

#### 2.2.1 Welcome Banner
- **Height**: 80-100px
- **Margins**: 16px (top/bottom)
- **Background**: Gradient using theme's primary colors
- **Border Radius**: 8px
- **Layout**: Flex container
- **Content**:
  - "Welcome to [CAMPAIGN NAME]" with subtitle describing campaign
  - Optional campaign description or flavor text
  - Could include campaign creation date or last activity date

### 2.3 Recent Activity Section

#### 2.3.1 Section Header
- **Layout**: Flex container with space-between
- **Content**: 
  - Left: "Recent Activity" heading (theme's heading typography)
  - Right: Optional filter dropdown for activity types

#### 2.3.2 Activity Cards Grid
- **Layout**: CSS Grid with 2-4 columns (responsive)
- **Grid Gap**: 16px
- **Card Height**: 120px (minimum)
- **Content Structure**:
  - Activity Type Icon (top-left corner)
  - Activity Title (bold)
  - Brief description (2 lines max, truncate with ellipsis)
  - Actor info (who performed the activity)
  - Timestamp (relative: "2 hours ago", "Yesterday", etc.)
- **Card States**:
  - Default: theme card style
  - Hover: slight elevation/highlight
  - Click: Navigate to the specific content
- **Empty State**: "No recent activity" message with CTA to create content

### 2.4 Campaign Stats Section

#### 2.4.1 Stats Cards
- **Layout**: Flex container or CSS Grid
- **Card Size**: Equal height, flexible width
- **Content Per Card**:
  - Large number (count)
  - Label (e.g., "NPCs", "Locations", "Active Quests")
  - Optional icon related to the stat
- **Visual**: Use theme's card styling with accent colors
- **Interaction**: Clicking navigates to corresponding section

#### 2.4.2 Progress Indicators
- **Types**:
  - Campaign completion percentage (if applicable)
  - Quest completion rate
- **Visualization**: Progress bars or circular progress indicators using theme colors

### 2.5 Continue Reading Section

#### 2.5.1 Last Viewed Content
- **Layout**: Horizontal row of cards with overflow scroll
- **Card Content**:
  - Content title
  - Type indicator (Chapter, NPC, etc.)
  - Last viewed timestamp
  - Optional thumbnail/icon
- **Behavior**: Clicking navigates directly to the content
- **Empty State**: Show suggestion cards for content types to create

### 2.6 Global Action Button

#### 2.6.1 Floating Action Button (FAB)
- **Position**: Fixed, bottom-right corner
- **Size**: 56px diameter
- **Icon**: "+" symbol
- **Color**: Theme's primary color
- **Behavior**: On click, shows a speed dial menu with options to create different content types
- **Menu Items**: New Chapter, New NPC, New Location, New Quest, New Rumor
- **Accessibility**: Include tooltip on hover

## 3. Layout Specifications

### 3.1 Container Structure
- **Max Width**: 1200px
- **Horizontal Margins**: Auto (center-aligned)
- **Padding**: 16px on small screens, 24px on larger screens
- **Layout Type**: CSS Grid for overall structure
- **Grid Template**:
  ```
  "banner banner" auto
  "activity stats" auto
  "continue continue" auto
  / 2fr 1fr
  ```
- **Responsive Adjustment**:
  - Single column layout on mobile: <768px
  - Two column layout on tablet and desktop: ≥768px

### 3.2 Spacing Guidelines
- **Section Margins**: 24px bottom margin between major sections
- **Component Padding**: 16px for cards and containers
- **Typography Spacing**: 8px between headings and content
- **Grid Gaps**: 16px between grid items
- **Responsive Adjustments**: Reduce spacing by 25% on mobile devices

## 4. Responsive Design Specifications

### 4.1 Breakpoint Definitions
- **Mobile**: <576px
- **Tablet**: 576px - 992px
- **Desktop**: >992px

### 4.2 Mobile Adaptations
- Header: Collapse navigation into hamburger menu
- Layout: Single column stacking of all sections
- Campaign Banner: Simplify to text only, reduce padding
- Activity Cards: Full width, 1 per row
- Stats Cards: 2 per row, simplified
- Action Button: Remains fixed at bottom-right

### 4.3 Tablet Adaptations
- Header: Maintain full navigation if space permits
- Layout: Two column grid for activity and stats
- Activity Cards: 2 per row
- Continue Reading: Horizontal scrolling row

### 4.4 Desktop Optimizations
- Full navigation with search expanded by default
- Three-column layout for activity cards
- Advanced filters visible for activity section
- Hover states and animations for interactive elements

## 5. Theme Integration

### 5.1 Theme Variables Usage
- Use existing theme system exclusively (no hardcoded colors)
- Reference the theme prefix variable for all styled components
- Example pattern:
  ```jsx
  className={clsx(
    "base-class",
    `${themePrefix}-typography-heading`,
    `${themePrefix}-card`
  )}
  ```

### 5.2 Theme Elements Mapping
- Card backgrounds: `${themePrefix}-card`
- Typography:
  - Headings: `${themePrefix}-typography-heading`
  - Body text: `${themePrefix}-typography`
  - Secondary text: `${themePrefix}-typography-secondary`
- Navigation: `${themePrefix}-navigation`
- Buttons: `${themePrefix}-button-${variant}`
- Icons: `${themePrefix}-icon-${type}`
- Form elements: `${themePrefix}-input`

## 6. Interaction Specifications

### 6.1 Navigation Flow
- Clicking section title navigates to section list page
- Clicking specific card navigates to detail view of that item
- "View All" links go to filtered list views
- Campaign selector changes the active campaign context

### 6.2 User Actions
- **Create Content**: Access via FAB or section-specific "Add" buttons
- **Filter Activity**: Dropdown or chip filters for content types
- **Search**: Global search available from header
- **Refresh Data**: Pull-to-refresh on mobile, refresh button on desktop

### 6.3 Loading States
- **Initial Load**: Skeleton screens for all content sections
- **Partial Updates**: Loading indicator for filtered content
- **Failed States**: Error messages with retry options
- **Empty States**: Custom illustrations with clear CTAs

## 7. Data Requirements

### 7.1 Recent Activity Feed
- Query most recent 6-8 items across all content types
- Sort by timestamp (newest first)
- Include: content type, title, actor, timestamp, action type
- Filter capability by content type

### 7.2 Campaign Statistics
- Total NPCs count
- Total Locations count
- Active/Completed Quests counts
- Story chapters count
- Optional: custom campaign metrics

### 7.3 Recently Viewed
- Track last 4-6 viewed content items per user
- Store content type, ID, title, and timestamp of view

## 8. Component Implementation Guidelines

### 8.1 File Structure
```
/src
  /components
    /features
      /dashboard
        DashboardPage.tsx
        CampaignBanner.tsx
        ActivityFeed.tsx
        CampaignStats.tsx
        ContinueReading.tsx
        GlobalActionButton.tsx
```

### 8.2 Key React Hooks
- Use `useEffect` for data fetching on component mount
- Use `useState` for local component state
- Use context hooks for global state:
  - `useAuth` for user information
  - `useGroups` for campaign context
  - `useTheme` for theming

### 8.3 Data Fetching
- Leverage existing context providers and services
- Implement proper loading and error states
- Use debouncing for search/filter operations
- Implement pagination for activity feed (load more)

## 9. Accessibility Considerations

### 9.1 Requirements
- All interactive elements must be keyboard navigable
- Proper ARIA labels for custom components
- Sufficient color contrast following WCAG standards
- Responsive font sizes using relative units (rem)
- Focus indicators for interactive elements

### 9.2 Screen Reader Support
- Semantic HTML structure
- ARIA roles for custom widgets
- Alternative text for icons and visual elements
- Announce dynamic content changes

## 10. Performance Optimization

### 10.1 Loading Strategy
- Implement lazy loading for below-the-fold content
- Use proper list virtualization for long activity feeds
- Optimize images and icons

### 10.2 State Management
- Leverage existing context providers for global state
- Use local state for component-specific concerns
- Implement proper memoization for expensive calculations

## 11. Implementation Phases

### 11.1 Phase 1: Core Structure
- Implement layout grid and responsive container
- Build streamlined header and navigation
- Create campaign banner with campaign information

### 11.2 Phase 2: Content Sections
- Implement recent activity feed with cards
- Build campaign stats section
- Create "continue reading" section

### 11.3 Phase 3: Interactive Elements
- Implement global action button
- Add filtering capabilities to activity feed
- Enhance responsive behaviors
- Finalize animations and transitions

### 11.4 Phase 4: Testing & Refinement
- Verify responsive behavior across breakpoints
- Test with various theme settings
- Conduct accessibility audit
- Performance optimization

## 12. Example Structure (Pseudo-code)

```jsx
const DashboardPage = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { activeGroup, activeCampaign } = useGroups();
  const themePrefix = theme.name;
  
  // State for activity feed
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch activities, stats, etc.
        const recentActivities = await fetchRecentActivity(activeCampaign.id);
        setActivities(recentActivities);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (activeCampaign?.id) {
      fetchDashboardData();
    }
  }, [activeCampaign?.id]);
  
  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${themePrefix}-content`}>
      {/* Campaign Banner */}
      <CampaignBanner campaign={activeCampaign} />
      
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Activity Feed - 2/3 width on desktop */}
        <div className="md:col-span-2">
          <ActivityFeed 
            activities={activities} 
            loading={loading} 
            onFilter={handleFilterActivities}
          />
        </div>
        
        {/* Campaign Stats - 1/3 width on desktop */}
        <div className="md:col-span-1">
          <CampaignStats campaignId={activeCampaign?.id} />
        </div>
      </div>
      
      {/* Continue Reading Section - Full width */}
      <div className="mt-8">
        <ContinueReading userId={user?.uid} />
      </div>
      
      {/* Global Action Button */}
      <GlobalActionButton campaignId={activeCampaign?.id} />
    </div>
  );
};
```

## 13. References and Resources

### 13.1 Existing Codebase Components
- Use `Button` from `components/core/Button.tsx`
- Use `Typography` from `components/core/Typography.tsx`
- Use `Card` from `components/core/Card.tsx`
- Use `Dialog` for modals from `components/core/Dialog.tsx`

### 13.2 Icon Library
- Use Lucide React icons for consistency with existing codebase
- Import pattern: `import { Icon1, Icon2 } from 'lucide-react';`

### 13.3 Theme Integration
- Follow pattern from existing components for theme integration
- Reference the theme context: `const { theme } = useTheme();`
- Use theme prefix: `const themePrefix = theme.name;`