import React, { useState, useEffect } from 'react';
import { CustomField, createCustomField, getCustomFieldsByProject, deleteCustomField } from '../lib/db/customFields';

const FIELD_TYPES = [
  { value: 'text', label: 'Testo' },
  { value: 'number', label: 'Numero' },
  { value: 'enum', label: 'Selezione singola' },
  { value: 'date', label: 'Data' },
  { value: 'multi_enum', label: 'Selezione multipla' },
];

interface CustomFieldManagerProps {
  projectId: string;
}

export function CustomFieldManager({ projectId }: CustomFieldManagerProps): React.ReactElement {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'enum' | 'date' | 'multi_enum'>('text');
  const [fieldOptions, setFieldOptions] = useState('');

  useEffect(() => {
    loadFields();
  }, [projectId]);

  const loadFields = async () => {
    setLoading(true);
    try {
      const data = await getCustomFieldsByProject(projectId);
      setFields(data);
    } catch (err) {
      console.error('Failed to load fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!fieldName.trim()) return;
    
    let options: string[] = [];
    if (fieldType === 'enum' || fieldType === 'multi_enum') {
      options = fieldOptions.split(',').map(o => o.trim()).filter(o => o);
    }

    try {
      await createCustomField(projectId, fieldName.trim(), fieldType, options);
      setFieldName('');
      setFieldType('text');
      setFieldOptions('');
      setShowForm(false);
      await loadFields();
    } catch (err) {
      console.error('Failed to create field:', err);
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (!confirm(`Eliminare il campo "${field.name}"?`)) return;
    try {
      await deleteCustomField(field.id);
      await loadFields();
    } catch (err) {
      console.error('Failed to delete field:', err);
    }
  };

  const getTypeLabel = (type: string) => FIELD_TYPES.find(f => f.value === type)?.label || type;

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="custom-field-manager">
      <div className="custom-field-header">
        <h4>Campi Personalizzati</h4>
        <button className="btn-small" onClick={() => setShowForm(true)}>
          + Nuovo Campo
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-muted">Nessun campo personalizzato. Aggiungi campi per arricchire i task.</p>
      ) : (
        <div className="custom-field-list">
          {fields.map(field => (
            <div key={field.id} className="custom-field-item">
              <div className="custom-field-info">
                <span className="custom-field-name">{field.name}</span>
                <span className="custom-field-type">{getTypeLabel(field.fieldType)}</span>
                {field.options.length > 0 && (
                  <span className="custom-field-options">
                    {field.options.join(', ')}
                  </span>
                )}
              </div>
              <button className="btn-icon" onClick={() => handleDelete(field)}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h3>Nuovo Campo Personalizzato</h3>
            <div className="form-group">
              <label>Nome campo</label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="Es: Priorità cliente"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={fieldType} onChange={(e) => setFieldType(e.target.value as any)}>
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            {(fieldType === 'enum' || fieldType === 'multi_enum') && (
              <div className="form-group">
                <label>Opzioni (separati da virgola)</label>
                <input
                  type="text"
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                  placeholder="Es: Basso, Medio, Alto"
                />
              </div>
            )}
            <div className="form-actions">
              <button onClick={() => setShowForm(false)}>Annulla</button>
              <button className="primary" onClick={handleCreate}>Crea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
