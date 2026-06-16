import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { apiPost, apiPut } from '../utils/api';
import { CARD_ARTS } from '../utils/cardArts';
import swal from 'sweetalert';

/**
 * CardModal — crea o edita una tarjeta.
 * Props:
 *   isOpen    {boolean}
 *   onClose   {() => void}
 *   onSuccess {() => void}
 *   userId    {string}
 *   accounts  {array}        lista de cuentas del usuario
 *   card      {object|null}  null → crear, objeto → editar
 */
const CardModal = ({ isOpen, onClose, onSuccess, userId, accounts, card }) => {
  const isEdit = !!card;
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    card_name: '',
    card_type: 'CREDITO',
    account_id: '',
    credit_limit: '',
    current_balance: '',
    expiry_month: '',
    expiry_year: '',
    cut_off_day: '',
    card_art: CARD_ARTS[0].id,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (isEdit) {
        const [em, ey] = card.expiry_date ? card.expiry_date.split('/') : ['', ''];
        setForm({
          card_name: card.card_name || '',
          card_type: card.card_type || 'CREDITO',
          account_id: card.account_id || '',
          credit_limit: card.credit_limit ?? '',
          current_balance: card.current_balance ?? '',
          expiry_month: em || '',
          expiry_year: ey || '',
          cut_off_day: card.cut_off_day ?? '',
          card_art: card.card_art || CARD_ARTS[0].id,
        });
      } else {
        setForm({
          ...emptyForm,
          account_id: accounts.length > 0 ? accounts[0].id : '',
        });
      }
      setErrors({});
    }
  }, [isOpen, card, accounts]);

  const isCredit = form.card_type === 'CREDITO';

  const validate = () => {
    const e = {};
    if (!form.card_name.trim()) e.card_name = 'El nombre es obligatorio';
    if (!isEdit) {
      if (!form.account_id) e.account_id = 'Selecciona una cuenta asociada';
      if (isCredit) {
        if (form.credit_limit === '' || isNaN(parseFloat(form.credit_limit)) || parseFloat(form.credit_limit) <= 0)
          e.credit_limit = 'El límite de crédito es obligatorio y debe ser mayor a 0';
        if (form.current_balance !== '' && (isNaN(parseFloat(form.current_balance)) || parseFloat(form.current_balance) < 0))
          e.current_balance = 'El saldo debe ser ≥ 0';
        if (form.credit_limit !== '' && form.current_balance !== '') {
          if (parseFloat(form.current_balance) > parseFloat(form.credit_limit))
            e.current_balance = 'El saldo usado no puede superar el límite de crédito';
        }
      }
    } else {
      // edit: solo credit_limit, vigencia y corte
      if (isCredit && form.credit_limit !== '' && (isNaN(parseFloat(form.credit_limit)) || parseFloat(form.credit_limit) <= 0))
        e.credit_limit = 'El límite debe ser mayor a 0';
    }

    // Validar vigencia: ambos o ninguno
    if ((form.expiry_month && !form.expiry_year) || (!form.expiry_month && form.expiry_year))
      e.expiry_month = 'Ingresa mes y año de vencimiento';
    if (form.expiry_month) {
      const m = parseInt(form.expiry_month, 10);
      if (isNaN(m) || m < 1 || m > 12) e.expiry_month = 'Mes inválido (01-12)';
    }
    if (form.expiry_year) {
      const y = parseInt(form.expiry_year, 10);
      if (isNaN(y) || y < 0 || y > 99) e.expiry_year = 'Año inválido (00-99)';
    }

    // Validar día de corte
    if (isCredit && form.cut_off_day !== '') {
      const d = parseInt(form.cut_off_day, 10);
      if (isNaN(d) || d < 1 || d > 31) e.cut_off_day = 'Día inválido (1-31)';
    }

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
      // Construir expiry_date en formato MM/YY
      const expiryDate = (form.expiry_month && form.expiry_year)
        ? `${form.expiry_month.padStart(2, '0')}/${form.expiry_year.padStart(2, '0')}`
        : null;

      if (isEdit) {
        const payload = { card_name: form.card_name.trim(), card_art: form.card_art };
        if (expiryDate) payload.expiry_date = expiryDate;
        if (isCredit) {
          if (form.credit_limit !== '') payload.credit_limit = parseFloat(form.credit_limit);
          if (form.cut_off_day !== '') payload.cut_off_day = parseInt(form.cut_off_day, 10);
        }
        res = await apiPut(`/cards/${card.id}`, payload);
      } else {
        const payload = {
          user_id: userId,
          card_name: form.card_name.trim(),
          card_type: form.card_type,
          account_id: form.account_id,
          card_art: form.card_art,
        };
        if (expiryDate) payload.expiry_date = expiryDate;
        if (isCredit) {
          payload.credit_limit = parseFloat(form.credit_limit);
          payload.current_balance = form.current_balance !== '' ? parseFloat(form.current_balance) : 0;
          if (form.cut_off_day !== '') payload.cut_off_day = parseInt(form.cut_off_day, 10);
        } else {
          payload.credit_limit = 0;
          payload.current_balance = 0;
        }
        res = await apiPost('/cards/create', payload);
      }

      if (res.ok) {
        swal('Éxito', isEdit ? 'Tarjeta actualizada correctamente' : 'Tarjeta creada correctamente', 'success');
        onSuccess();
        onClose();
      } else {
        const msg = res.data?.error || 'Error al guardar la tarjeta';
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
          <h2>{isEdit ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h2>
          <button className="close-btn" onClick={onClose} type="button">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-body">

            <div className="form-group">
              <label>Nombre de la tarjeta *</label>
              <input
                type="text"
                name="card_name"
                value={form.card_name}
                onChange={handleChange}
                placeholder="Ej: Visa Ripley"
                maxLength={100}
                className={errors.card_name ? 'error' : ''}
              />
              {errors.card_name && <span className="error-msg">{errors.card_name}</span>}
            </div>

            <div className="form-group">
              <label>Arte de la tarjeta</label>
              <div className="art-swatch-row">
                {CARD_ARTS.map(art => (
                  <button
                    type="button"
                    key={art.id}
                    className={`art-swatch ${form.card_art === art.id ? 'selected' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, card_art: art.id }))}
                    title={art.label}
                  >
                    <span className="art-swatch-preview" style={{ background: art.colors[0] }}>
                      <span style={{ background: art.colors[1] }} />
                      <span style={{ background: art.colors[2] }} />
                      <span style={{ background: art.colors[3] }} />
                    </span>
                    <span className="art-swatch-label">{art.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo: solo editable al crear */}
            {!isEdit ? (
              <div className="form-group">
                <label>Tipo de tarjeta *</label>
                <div className="radio-group">
                  <label className={`radio-opt ${form.card_type === 'CREDITO' ? 'selected' : ''}`}>
                    <input type="radio" name="card_type" value="CREDITO" checked={form.card_type === 'CREDITO'} onChange={handleChange} />
                    <span className="dot" />
                    💳 Crédito
                  </label>
                  <label className={`radio-opt ${form.card_type === 'DEBITO' ? 'selected' : ''}`}>
                    <input type="radio" name="card_type" value="DEBITO" checked={form.card_type === 'DEBITO'} onChange={handleChange} />
                    <span className="dot" />
                    🏧 Débito
                  </label>
                </div>
              </div>
            ) : (
              <div className="read-only-group">
                <span className="ro-label">Tipo</span>
                <span className={`type-badge ${card.card_type === 'CREDITO' ? 'credit' : 'debit'}`}>
                  {card.card_type === 'CREDITO' ? '💳 Crédito' : '🏧 Débito'}
                </span>
                <span className="ro-hint">No modificable una vez creada</span>
              </div>
            )}

            {/* Cuenta asociada: solo editable al crear */}
            {!isEdit ? (
              <div className="form-group">
                <label>Cuenta del banco asociada *</label>
                <select
                  name="account_id"
                  value={form.account_id}
                  onChange={handleChange}
                  className={errors.account_id ? 'error' : ''}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} — ${parseFloat(acc.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
                {errors.account_id && <span className="error-msg">{errors.account_id}</span>}
                <span className="field-hint">
                  {form.card_type === 'DEBITO'
                    ? 'La tarjeta de débito descontará directamente de esta cuenta.'
                    : 'Los pagos de esta tarjeta de crédito saldrán de esta cuenta.'}
                </span>
              </div>
            ) : (
              <div className="read-only-group">
                <span className="ro-label">Cuenta asociada</span>
                <span className="ro-value">
                  {accounts.find(a => a.id === card.account_id)?.account_name ?? card.account_id}
                </span>
                <span className="ro-hint">No modificable una vez creada</span>
              </div>
            )}

            {/* Campos solo para crédito */}
            {isCredit && (
              <>
                <div className="form-group">
                  <label>Límite de crédito *</label>
                  <input
                    type="number"
                    name="credit_limit"
                    value={form.credit_limit}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className={errors.credit_limit ? 'error' : ''}
                  />
                  {errors.credit_limit && <span className="error-msg">{errors.credit_limit}</span>}
                </div>

                {!isEdit && (
                  <div className="form-group">
                    <label>Saldo actual usado</label>
                    <input
                      type="number"
                      name="current_balance"
                      value={form.current_balance}
                      onChange={handleChange}
                      placeholder="0.00 (dejar en 0 si es tarjeta nueva)"
                      min="0"
                      step="0.01"
                      className={errors.current_balance ? 'error' : ''}
                    />
                    {errors.current_balance && <span className="error-msg">{errors.current_balance}</span>}
                  </div>
                )}

                <div className="form-group">
                  <label>Día de corte mensual</label>
                  <input
                    type="number"
                    name="cut_off_day"
                    value={form.cut_off_day}
                    onChange={handleChange}
                    placeholder="Ej: 10"
                    min="1"
                    max="31"
                    className={errors.cut_off_day ? 'error' : ''}
                  />
                  {errors.cut_off_day && <span className="error-msg">{errors.cut_off_day}</span>}
                  <span className="field-hint">Día de cada mes en que se aplican los cargos (1-31)</span>
                </div>
              </>
            )}

            {/* Vigencia — aplica a crédito y débito */}
            <div className="form-group">
              <label>Vigencia de la tarjeta (MM/AA)</label>
              <div className="expiry-row">
                <input
                  type="text"
                  name="expiry_month"
                  value={form.expiry_month}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setForm(prev => ({ ...prev, expiry_month: val }));
                    if (errors.expiry_month) setErrors(prev => ({ ...prev, expiry_month: undefined }));
                  }}
                  placeholder="MM"
                  maxLength={2}
                  className={errors.expiry_month ? 'error' : ''}
                />
                <span className="expiry-sep">/</span>
                <input
                  type="text"
                  name="expiry_year"
                  value={form.expiry_year}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setForm(prev => ({ ...prev, expiry_year: val }));
                    if (errors.expiry_year) setErrors(prev => ({ ...prev, expiry_year: undefined }));
                  }}
                  placeholder="AA"
                  maxLength={2}
                  className={errors.expiry_year ? 'error' : ''}
                />
              </div>
              {errors.expiry_month && <span className="error-msg">{errors.expiry_month}</span>}
              {errors.expiry_year && <span className="error-msg">{errors.expiry_year}</span>}
              <span className="field-hint">Ej: 11/35 = Noviembre 2035</span>
            </div>

            {!isCredit && !isEdit && (
              <div className="info-box">
                <span className="info-icon">ℹ️</span>
                La tarjeta de débito no tiene límite de crédito. El saldo disponible se toma directamente de la cuenta asociada.
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className={`btn-submit ${isEdit ? 'edit' : 'create'}`} disabled={submitting}>
              {submitting ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear tarjeta')}
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
  max-width: 500px;
  max-height: 92vh;
  overflow-y: auto;
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
    position: sticky;
    top: 0;
    background: white;
    border-radius: 16px 16px 0 0;
    z-index: 1;
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

  .field-hint {
    font-size: 0.78rem;
    color: #6b7280;
    margin-top: 2px;
  }

  .error-msg {
    font-size: 0.8rem;
    color: #ef4444;
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
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);

    span:nth-child(1) { position: absolute; width: 28px; height: 28px; border-radius: 50%; top: -10px; right: -8px; opacity: 0.95; }
    span:nth-child(2) { position: absolute; width: 22px; height: 22px; border-radius: 50%; bottom: -8px; left: -6px; opacity: 0.85; }
    span:nth-child(3) { position: absolute; width: 12px; height: 12px; border-radius: 50%; bottom: 4px; right: 6px; opacity: 0.9; }
  }

  .art-swatch-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #6b7280;
  }

  .radio-group {
    display: flex;
    gap: 12px;
    .radio-opt {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      color: #374151;
      transition: all 0.15s;
      input[type="radio"] { display: none; }
      &.selected {
        border-color: #3b82f6;
        background: #eff6ff;
        color: #1d4ed8;
      }
      &:hover:not(.selected) { border-color: #94a3b8; background: #f8fafc; }
    }
  }

  .read-only-group {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 14px;
    flex-wrap: wrap;
    .ro-label { font-size: 0.82rem; font-weight: 600; color: #6b7280; min-width: 120px; }
    .ro-value { font-size: 0.9rem; color: #1f2937; font-weight: 500; }
    .ro-hint  { font-size: 0.75rem; color: #9ca3af; margin-left: auto; }
  }

  .type-badge {
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    &.credit { background: #ede9fe; color: #5b21b6; }
    &.debit  { background: #dcfce7; color: #166534; }
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
    .info-icon { flex-shrink: 0; }
  }

  .expiry-row {
    display: flex;
    align-items: center;
    gap: 6px;
    input {
      width: 60px;
      text-align: center;
      font-variant-numeric: tabular-nums;
      letter-spacing: 2px;
    }
  }

  .expiry-sep {
    font-size: 1.2rem;
    font-weight: 600;
    color: #6b7280;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 28px 24px;
    border-top: 1px solid #f3f4f6;
    margin-top: 8px;
    position: sticky;
    bottom: 0;
    background: white;
    border-radius: 0 0 16px 16px;
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

export default CardModal;
