// src/features/user-management/groups/pages/JoinPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import JoinGroupForm from '../components/JoinGroupForm';
import { useJoinGroupCompletion } from '../hooks/useJoinGroupCompletion';
import { CAMPAIGN_HOME } from '../../auth/utils/next-path';

/**
 * `/join` -- the invitation, as a page.
 *
 * An invite link is a link, and until now it landed nowhere: the token was
 * read from the query by a dialog that only opened if something else opened
 * it. The route is the destination the link always implied.
 *
 * The form reads `token` and `groupId` from the query exactly as it does in
 * the dialog. Stating the token rather than showing it in a text field, the
 * band naming the group, and registration as a step on this page are all
 * 14-4's; this PR only gives the link somewhere to land.
 */
const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const completeJoin = useJoinGroupCompletion();

  /**
   * The same landing behaviour as every other entrance, rather than a second
   * one: `useJoinGroupCompletion` switches to the group that just appeared,
   * so the page you arrive on is the group you joined.
   */
  const handleSuccess = async () => {
    await completeJoin();
    navigate(CAMPAIGN_HOME, { replace: true });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <JoinGroupForm onSuccess={handleSuccess} />
    </div>
  );
};

export default JoinPage;
