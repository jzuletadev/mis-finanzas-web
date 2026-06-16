import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { apiPost, apiPut } from '../utils/api';
import { ACCOUNT_ARTS } from '../utils/cardArts';
import swal from 'sweetalert';

/**
 * AccountModal — crea o edita una cuenta bancaria.
 * Props:
 *   isOpen    {boolean}
 *   onClose   {() => void}
 *   onSuccess {() => void}
 *   userId    {string}
 *   account   {object|null}  null → crear, objeto → editar
 */
const AccountModal = ({ isOpen, onClose, onSuccess, userId, account }) => {
  const isEdit = !!account;
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    account_name: '',
    account_type: 'AHORRO',
    balance: '',
    account_art: ACCOUNT_ARTS[0].id,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (isEdit) {
        setForm({
          account_name: account.account_name || '',
          account_type: account.account_type || 'AHORRO',
          balance: '', // no se edita el balance directamente
          account_art: account.account_art || ACCOUNT_ARTS[0].id,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [isOpen, account]);

  const validate = () => {
    const e = {};
    if (!form.account_name.trim()) e.account_name = 'El nombre es obligatorio';
    if (!isEdit && (form.balance === '' || isNaN(parseFloat(form.balance)) || parseFloat(form.balance) < 0))
      e.balance = 'Ingresa un saldo inicial válido (≥ 0)';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

    setSubmitting(true);
    try {
      let res;
      if (isEdit) {
        res = await apiPut(`/accounts/${account.id}`, {
          account_name: form.account_name.trim(),
          account_type: form.account_type,
          account_art: form.account_art,
        });
      } else {
        res = await apiPost('/accounts/create', {
          user_id: userId,
          account_name: form.account_name.trim(),
          account_type: form.account_type,
          balance: parseFloat(form.balance),
          account_art: form.account_art,
        });
      }

      if (res.ok) {
        swal('Éxito', isEdit ? 'Cuenta actualizada correctamente' : 'Cuenta creada correctamente', 'success');
        onSuccess();
        onClose();
      } else {
        const msg = res.data?.error || 'Error al guardar la cuenta';
        swal('Error', msg, 'error');
      }
    } catch {
      swal('Error', 'Error de conexión con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
          <button className="close-btn" onClick={onClose} type="button">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-body">

            <div className="form-group">
              <label>Nombre de la cuenta *</label>
              <input
                type="text"
                name="account_name"
                value={form.account_name}
                onChange={handleChange}
                placeholder="Ej: Cuenta Corriente BCI"
                maxLength={100}
                className={errors.account_name ? 'error' : ''}
              />
              {errors.account_name && <span className="error-msg">{errors.account_name}</span>}
            </div>

            <div className="form-group">
              <label>Arte de la cuenta</label>
              <div className="art-swatch-row">
                {ACCOUNT_ARTS.map(art => (
                  <button
                    type="button"
                    key={art.id}
                    className={`art-swatch ${form.account_art === art.id ? 'selected' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, account_art: art.id }))}
                    title={art.label}
                  >
                    <span className="art-swatch-preview" style={{ background: art.colors[0] }}>
                      <span style={{ background: art.colors[1] }} />
                      <span style={{ background: art.colors[2] }} />
                    </span>
                    <span className="art-swatch-label">{art.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Tipo de cuenta *</label>
              <select name="account_type" value={form.account_type} onChange={handleChange}>
                <option value="AHORRO">Cuenta de Ahorro</option>
                <option value="MONETARIA">Cuenta Monetaria / Corriente</option>
              </select>
            </div>

            {!isEdit && (
              <div className="form-group">
                <label>Saldo inicial *</label>
                <input
                  type="number"
                  name="balance"
                  value={form.balance}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={errors.balance ? 'error' : ''}
                />
                {errors.balance && <span className="error-msg">{errors.balance}</span>}
              </div>
            )}

            {isEdit && (
              <div className="info-box">
                <span className="info-icon">ℹ️</span>
                El saldo se actualiza automáticamente mediante transacciones y no puede modificarse directamente.
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={`btn-submit ${isEdit ? 'edit' : 'create'}`} disabled={submitting}>
              {submitting ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear cuenta')}
            </button>
          </div>
        </form>
      </ModalContainer>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.25s ease;
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 22px 28px 16px;
    border-bottom: 1px solid #e5e7eb;
    h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: #1f2937;
    }
  }

  .close-btn {
    width: 34px; height: 34px;
    border: none; background: #f3f4f6;
    border-radius: 8px; font-size: 1.4rem;
    cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    color: #6b7280; transition: all 0.15s;
    &:hover { background: #e5e7eb; color: #1f2937; }
  }

  .form-body {
    padding: 22px 28px 8px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #374151;
    }
    input, select {
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: inherit;
      background: #fafbfc;
      color: #1f2937;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus {
        outline: none;
        border-color: #3b82f6;
        background: white;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      }
      &.error { border-color: #ef4444; }
    }
  }

  .error-msg {
    font-size: 0.8rem;
    color: #ef4444;
    margin-top: 2px;
  }

  .art-swatch-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .art-swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border: 2px solid transparent;
    border-radius: 12px;
    background: none;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    &:hover { background: #f8fafc; }
    &.selected {
      border-color: #3b82f6;
      background: #eff6ff;
    }
  }

  .art-swatch-preview {
    position: relative;
    width: 56px;
    height: 36px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);

    span:nth-child(1) { position: absolute; width: 30px; height: 30px; border-radius: 50%; top: -10px; right: -10px; opacity: 0.9; }
    span:nth-child(2) { position: absolute; width: 24px; height: 24px; border-radius: 50%; bottom: -10px; left: -8px; opacity: 0.85; }
  }

  .art-swatch-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #6b7280;
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 0.82rem;
    color: #1d4ed8;
    .info-icon { flex-shrink: 0; margin-top: 1px; }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 28px 24px;
    border-top: 1px solid #f3f4f6;
    margin-top: 8px;
  }

  .btn-cancel {
    padding: 10px 22px;
    border: 2px solid #e2e8f0;
    background: white;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    color: #6b7280;
    font-family: inherit;
    transition: all 0.15s;
    &:hover { background: #f9fafb; border-color: #d1d5db; }
  }

  .btn-submit {
    padding: 10px 26px;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    color: white;
    font-family: inherit;
    transition: all 0.15s;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &.create { background: #3b82f6; &:hover:not(:disabled) { background: #2563eb; } }
    &.edit   { background: #8b5cf6; &:hover:not(:disabled) { background: #7c3aed; } }
  }
`;

export default AccountModal;
