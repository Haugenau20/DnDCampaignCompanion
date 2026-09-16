// src/features/user-management/admin/pages/AdminGroupPage.tsx
import React from 'react';
import GroupManagementView from '../components/GroupManagementView';

/**
 * `/admin/group`.
 *
 * Renders the existing view unchanged; its layout -- including deleting the
 * closing note that tells the reader to visit two other tabs -- is 14-3's.
 */
const AdminGroupPage: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 pb-8">
    <GroupManagementView />
  </div>
);

export default AdminGroupPage;
