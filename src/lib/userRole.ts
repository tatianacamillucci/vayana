export type AppRole = 'member' | 'team_lead' | 'owner';

const USER_ROLE_STORAGE_KEY = 'vayana_user_role_v1';
const ROLE_CHANGE_EVENT = 'vayana-role-changed';

export function getStoredUserRole(): AppRole {
  const raw = localStorage.getItem(USER_ROLE_STORAGE_KEY);
  if (raw === 'team_lead' || raw === 'owner' || raw === 'member') {
    return raw;
  }
  return 'member';
}

export function setStoredUserRole(role: AppRole): void {
  localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
}

export function subscribeToRoleChanges(onChange: (role: AppRole) => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== USER_ROLE_STORAGE_KEY) return;
    onChange(getStoredUserRole());
  };

  const onRoleEvent = () => onChange(getStoredUserRole());

  window.addEventListener('storage', onStorage);
  window.addEventListener(ROLE_CHANGE_EVENT, onRoleEvent);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(ROLE_CHANGE_EVENT, onRoleEvent);
  };
}

export function canAccessTeamOverview(role: AppRole): boolean {
  return role === 'team_lead' || role === 'owner';
}
