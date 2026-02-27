import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { apiGet, apiPost } from '../utils/api';
import swal from 'sweetalert';

const TransactionForm = ({ isOpen, onClose, type, userId, accounts, cards, onSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    account_id: '',
    card_id: '',
    type_id: '',
    category_id: '',
    amount: '',
    description: '',
  });

  const isIncome = type === 'INGRESO';

  useEffect(() => {
    if (isOpen) {
      loadCatalogs();
      setFormData({
        account_id: accounts.length > 0 ? accounts[0].id : '',
        card_id: '',
        type_id: '',
        category_id: '',
        amount: '',
        description: '',
      });
    }
  }, [isOpen, type]);

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const [categoriesRes, typesRes] = await Promise.all([
        apiGet(`/catalogs/categories/${type}`),
        apiGet('/catalogs/types'),
      ]);

      if (categoriesRes.ok && categoriesRes.data.data) {
        setCategories(categoriesRes.data.data);
      }
      if (typesRes.ok && typesRes.data.data) {
        setTypes(typesRes.data.data);
        // Pre-select DEPOSITO for income, OTRO for expense
        const defaultType = typesRes.data.data.find(t =>
          isIncome ? t.name === 'DEPOSITO' : t.name === 'OTRO'
        );
        if (defaultType) {
          setFormData(prev => ({ ...prev, type_id: defaultType.id }));
        }
      }
    } catch (err) {
      console.error('Error loading catalogs:', err);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'card_id') {
      const chosenCard = cards.find(c => c.id === value);
      const typeName = types.find(t => t.id === parseInt(formData.type_id))?.name;

      // Para compra con tarjeta débito o pago de tarjeta de crédito,
      // fijar automáticamente la cuenta vinculada a la tarjeta
      if (
        chosenCard?.account_id &&
        (typeName === 'PAGO_TARJETA' ||
          (typeName === 'COMPRA_TARJETA' && chosenCard?.card_type === 'DEBITO'))
      ) {
        setFormData(prev => ({ ...prev, card_id: value, account_id: chosenCard.account_id }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_id) {
      return swal('Error', 'Selecciona una cuenta', 'error');
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return swal('Error', 'Ingresa un monto válido', 'error');
    }
    if (!formData.type_id) {
      return swal('Error', 'Selecciona un tipo de transacción', 'error');
    }
    if (!formData.category_id) {
      return swal('Error', 'Selecciona una categoría', 'error');
    }
    const selectedTypeName = types.find(t => t.id === parseInt(formData.type_id))?.name;
    if ((selectedTypeName === 'COMPRA_TARJETA' || selectedTypeName === 'PAGO_TARJETA') && !formData.card_id) {
      return swal('Error', 'Selecciona una tarjeta para este tipo de transacción', 'error');
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: userId,
        account_id: formData.account_id,
        card_id: formData.card_id || null,
        type_id: parseInt(formData.type_id),
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount),
        description: formData.description,
      };

      const res = await apiPost('/transactions/create', payload);

      if (res.ok) {
        swal('Éxito', isIncome ? 'Ingreso registrado correctamente' : 'Gasto registrado correctamente', 'success');
        onSuccess();
        onClose();
      } else {
        console.log('Error response from server:', res);
        const errorMsg = res.data?.error || 'Error al registrar la transacción';
        swal('Error', errorMsg, 'error');
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      swal('Error', 'Error al registrar la transacción', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Mostrar selector de tarjeta para COMPRA_TARJETA y PAGO_TARJETA
  const selectedType = types.find(t => t.id === parseInt(formData.type_id));
  const showCardSelector = selectedType?.name === 'COMPRA_TARJETA' || selectedType?.name === 'PAGO_TARJETA';
  // Para débito en COMPRA_TARJETA y para PAGO_TARJETA la cuenta queda bloqueada a la vinculada a la tarjeta
  const selectedCard = cards.find(c => c.id === formData.card_id);
  const accountIsLockedByCard =
    showCardSelector &&
    selectedCard?.account_id &&
    (selectedType?.name === 'PAGO_TARJETA' ||
      (selectedType?.name === 'COMPRA_TARJETA' && selectedCard?.card_type === 'DEBITO'));

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <FormContainer onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>{isIncome ? 'Registrar Ingreso' : 'Registrar Gasto'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {loadingCatalogs ? (
          <div className="loading">Cargando datos...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Cuenta *{accountIsLockedByCard && ' (vinculada a la tarjeta)'}</label>
                <select
                  name="account_id"
                  value={formData.account_id}
                  onChange={handleChange}
                  required
                  disabled={!!accountIsLockedByCard}
                  style={accountIsLockedByCard ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (${acc.balance})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Monto *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de Transacción *</label>
                <select
                  name="type_id"
                  value={formData.type_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar tipo...</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Categoría *</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {showCardSelector && (
                <div className="form-group full-width">
                  <label>Tarjeta</label>
                  <select
                    name="card_id"
                    value={formData.card_id}
                    onChange={handleChange}
                  >
                    <option value="">Seleccionar tarjeta...</option>
                    {cards.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.card_name} ({c.card_type}) - ${c.current_balance}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group full-width">
                <label>Descripción</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descripción de la transacción..."
                  maxLength={255}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className={`submit-btn ${isIncome ? 'income' : 'expense'}`}
                disabled={submitting}
              >
                {submitting ? 'Registrando...' : (isIncome ? 'Registrar Ingreso' : 'Registrar Gasto')}
              </button>
            </div>
          </form>
        )}
      </FormContainer>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const FormContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 28px 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .form-header h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: #1f2937;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: #f3f4f6;
    border-radius: 10px;
    font-size: 1.4rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #e5e7eb;
    color: #1f2937;
  }

  .loading {
    padding: 40px;
    text-align: center;
    color: #6b7280;
  }

  form {
    padding: 24px 28px 28px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
  }

  .form-group input,
  .form-group select {
    padding: 10px 14px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    font-family: inherit;
    background: #fafbfc;
    transition: all 0.2s;
    color: #1f2937;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group input[type="number"] {
    font-variant-numeric: tabular-nums;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #f3f4f6;
  }

  .cancel-btn {
    padding: 10px 24px;
    border: 2px solid #e2e8f0;
    background: white;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.15s;
    font-family: inherit;
  }

  .cancel-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .submit-btn {
    padding: 10px 28px;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    color: white;
    transition: all 0.15s;
    font-family: inherit;
  }

  .submit-btn.income {
    background: #10b981;
  }

  .submit-btn.income:hover:not(:disabled) {
    background: #059669;
  }

  .submit-btn.expense {
    background: #ef4444;
  }

  .submit-btn.expense:hover:not(:disabled) {
    background: #dc2626;
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 540px) {
    width: 95%;

    .form-grid {
      grid-template-columns: 1fr;
    }

    form {
      padding: 16px 20px 24px;
    }

    .form-header {
      padding: 20px 20px 14px;
    }
  }
`;

export default TransactionForm;
