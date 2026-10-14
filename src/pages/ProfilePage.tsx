import React, { useEffect, useState } from 'react';
import { AppRole, getStoredUserRole, setStoredUserRole } from '../lib/userRole';
import { useCurrentUser } from '../lib/hooks/useUsers';
import { apiClient } from '../lib/api/client';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

interface ProfileData {
  fullName: string;
  jobTitle: string;
  email: string;
  avatarUrl: string;
  bio: string;
  timezone: string;
  language: string;
  weeklySummary: boolean;
  mentionNotifications: boolean;
}

const STORAGE_KEY = 'vayana_profile_settings_v1';

const defaultProfile: ProfileData = {
  fullName: 'Il tuo nome',
  jobTitle: 'Ruolo',
  email: 'you@example.com',
  avatarUrl: '',
  bio: '',
  timezone: 'Europe/Rome',
  language: 'it-IT',
  weeklySummary: true,
  mentionNotifications: true,
};

export function ProfilePage(): React.ReactElement {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [appRole, setAppRole] = useState<AppRole>('member');
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Backend-only: load current user from API
  const { data: apiUser } = useCurrentUser();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Partial<ProfileData>;
      setProfile({ ...defaultProfile, ...parsed });
    } catch {
      // Ignore malformed local storage and keep defaults.
    }
  }, []);

  useEffect(() => {
    setAppRole(getStoredUserRole());
  }, []);

  // When backend user data arrives, overlay on top of local storage
  useEffect(() => {
    if (!USE_BACKEND || !apiUser) return;
    const fullName = [apiUser.firstName, apiUser.lastName].filter(Boolean).join(' ');
    setProfile((prev) => ({
      ...prev,
      fullName: fullName || prev.fullName,
      email: apiUser.email || prev.email,
    }));
  }, [apiUser]);

  const updateField = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveProfile = () => {
    const persist = async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setStoredUserRole(appRole);

      if (USE_BACKEND) {
        const [firstName, ...rest] = profile.fullName.trim().split(/\s+/);
        const lastName = rest.join(' ');

        try {
          await apiClient.patch('/users/me', {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
          });
          setSaveMessage('Salvato su account e in locale');
        } catch {
          setSaveMessage('Salvato solo in locale');
        }
      } else {
        setSaveMessage('Salvato in locale');
      }

      setSaved(true);
    };

    void persist();
  };

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profilo</h1>
        <p>Personalizza il tuo account.</p>
      </div>

      <div className="profile-layout">
        <section className="card profile-card">
          <h2>Dati personali</h2>
          <div className="form-grid">
            <label>
              Nome completo
              <input
                value={profile.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Mario Rossi"
              />
            </label>
            <label>
              Ruolo
              <input
                value={profile.jobTitle}
                onChange={(e) => updateField('jobTitle', e.target.value)}
                placeholder="Product Manager"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={profile.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Avatar URL
              <input
                value={profile.avatarUrl}
                onChange={(e) => updateField('avatarUrl', e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="full-width">
              Bio
              <textarea
                value={profile.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder="Scrivi qualcosa su di te..."
                rows={4}
              />
            </label>
          </div>
        </section>

        <section className="card profile-card">
          <h2>Preferenze</h2>
          <div className="form-grid">
            <label>
              Fuso orario
              <select
                value={profile.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
              >
                <option value="Europe/Rome">Europe/Rome</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </label>
            <label>
              Lingua
              <select
                value={profile.language}
                onChange={(e) => updateField('language', e.target.value)}
              >
                <option value="it-IT">Italiano</option>
                <option value="en-US">English</option>
              </select>
            </label>
            <label className="checkbox-row full-width">
              <input
                type="checkbox"
                checked={profile.weeklySummary}
                onChange={(e) => updateField('weeklySummary', e.target.checked)}
              />
              Ricevi riepilogo settimanale email
            </label>
            <label className="checkbox-row full-width">
              <input
                type="checkbox"
                checked={profile.mentionNotifications}
                onChange={(e) => updateField('mentionNotifications', e.target.checked)}
              />
              Notifiche immediate per mention
            </label>
            <label className="full-width">
              Ruolo applicativo
              <select value={appRole} onChange={(e) => setAppRole(e.target.value as AppRole)}>
                <option value="member">Member</option>
                <option value="team_lead">Team Lead</option>
                <option value="owner">Owner</option>
              </select>
            </label>
          </div>
        </section>

        <aside className="card profile-preview">
          <h2>Anteprima</h2>
          <div className="preview-user">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.fullName} />
            ) : (
              <div className="avatar-fallback">{initials || 'U'}</div>
            )}
            <div>
              <h3>{profile.fullName || 'Il tuo nome'}</h3>
              <p>{profile.jobTitle || 'Ruolo'}</p>
              <small>{profile.email || 'email@example.com'}</small>
            </div>
          </div>
          <p className="preview-bio">{profile.bio || 'Nessuna bio impostata.'}</p>
        </aside>
      </div>

      <div className="profile-actions">
        <button className="btn-primary" onClick={saveProfile}>
          Salva profilo
        </button>
        {saved && <span className="save-ok">Salvato</span>}
        {saveMessage && <span className="text-secondary">{saveMessage}</span>}
      </div>
    </div>
  );
}
