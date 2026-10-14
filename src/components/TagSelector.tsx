import React from 'react';
import { Tag } from '../lib/db/tags';

interface TagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ tags, selectedTagIds, onChange }: TagSelectorProps): React.ReactElement {
  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  if (tags.length === 0) {
    return (
      <div className="tag-selector-empty">
        <span className="text-muted">Nessun tag disponibile. Crea tag nel progetto.</span>
      </div>
    );
  }

  return (
    <div className="tag-selector">
      {tags.map(tag => (
        <button
          key={tag.id}
          type="button"
          className={`tag-chip ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
          style={{
            backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : 'transparent',
            borderColor: tag.color,
            color: selectedTagIds.includes(tag.id) ? '#fff' : tag.color,
          }}
          onClick={() => toggleTag(tag.id)}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
