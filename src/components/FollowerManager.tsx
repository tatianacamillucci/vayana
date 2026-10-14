import React, { useState, useEffect } from 'react';
import { addFollower, removeFollower, getFollowersByTask } from '../lib/db/followers';

interface FollowerManagerProps {
  taskId: string;
}

export function FollowerManager({ taskId }: FollowerManagerProps): React.ReactElement {
  const [followers, setFollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFollower, setNewFollower] = useState('');

  useEffect(() => {
    loadFollowers();
  }, [taskId]);

  const loadFollowers = async () => {
    setLoading(true);
    try {
      const data = await getFollowersByTask(taskId);
      setFollowers(data);
    } catch (err) {
      console.error('Failed to load followers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newFollower.trim()) return;
    try {
      await addFollower(taskId, newFollower.trim());
      setNewFollower('');
      await loadFollowers();
    } catch (err) {
      console.error('Failed to add follower:', err);
    }
  };

  const handleRemove = async (followerId: string) => {
    try {
      await removeFollower(taskId, followerId);
      await loadFollowers();
    } catch (err) {
      console.error('Failed to remove follower:', err);
    }
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="follower-manager">
      <div className="follower-header">
        <h4>Follower ({followers.length})</h4>
      </div>

      <div className="follower-input">
        <input
          type="text"
          value={newFollower}
          onChange={(e) => setNewFollower(e.target.value)}
          placeholder="Aggiungi follower (nome)"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd}>+</button>
      </div>

      {followers.length === 0 ? (
        <p className="text-muted">Nessun follower.</p>
      ) : (
        <div className="follower-list">
          {followers.map(follower => (
            <div key={follower} className="follower-item">
              <span>👤 {follower}</span>
              <button className="btn-icon" onClick={() => handleRemove(follower)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
