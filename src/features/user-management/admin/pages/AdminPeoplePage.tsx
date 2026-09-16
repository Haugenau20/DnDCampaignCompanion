// src/features/user-management/admin/pages/AdminPeoplePage.tsx
import React from 'react';
import UserManagementView from '../components/UserManagementView';
import TokenManagementView from '../components/TokenManagementView';

/**
 * `/admin/people` -- members and invitations.
 *
 * The two existing views are stacked here unchanged, which is deliberately
 * not the end state: the Users table and the Tokens table currently show the
 * same people twice, in two vocabularies. Merging them into one view is 14-2's
 * whole job. Until then this route exists, is linkable and is reachable, which
 * is what 14-1 is for.
 */
const AdminPeoplePage: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 pb-8 space-y-6">
    <UserManagementView />
    <TokenManagementView />
  </div>
);

export default AdminPeoplePage;
