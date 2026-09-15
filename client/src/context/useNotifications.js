/**
 * useNotifications Hook — The PickleHub
 *
 * Custom hook to access notification context, alert history, and push dispatcher.
 */

import { useContext } from 'react';
import NotificationContext from './NotificationContextDef';

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default useNotifications;
