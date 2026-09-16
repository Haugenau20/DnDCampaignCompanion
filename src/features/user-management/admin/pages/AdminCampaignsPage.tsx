// src/features/user-management/admin/pages/AdminCampaignsPage.tsx
import React from 'react';
import CampaignManagementView from '../components/CampaignManagementView';

/**
 * `/admin/campaigns`.
 *
 * Renders the existing view unchanged; its layout is 14-3's.
 */
const AdminCampaignsPage: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 pb-8">
    <CampaignManagementView />
  </div>
);

export default AdminCampaignsPage;
