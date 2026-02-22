import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import styled from 'styled-components';
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

import { useAuth } from '../context/authContext'
import { apiGet, apiPost } from '../utils/api';


import Loader from '../components/loader';

import swal from 'sweetalert';
import ButtonMenu from '../components/buttonMenu';
import TransactionForm from '../components/transactionForm';


const Dashboard = () => {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [incoming, setIncoming] = useState(0);
  const [outcoming, setOutcoming] = useState(0);
  const [monthBalance, setMonthBalance] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const calculateBalances = (transactions) => {
    let incomingTotal = 0;
    let outcomingTotal = 0;

    console.log('Calculating balances from transactions:', transactions);

    transactions.forEach(txn => {
      if (txn.category_type === 'INGRESO') {
        incomingTotal += parseFloat(txn.amount);
        console.log('Ingreso:', txn.amount, 'Total Ingreso:', incomingTotal);
      } else if (txn.category_type === 'GASTO') {
        outcomingTotal += parseFloat(txn.amount);
      }
    });

    setIncoming(incomingTotal);
    setOutcoming(outcomingTotal);
    setBalance(incomingTotal - outcomingTotal);
  };

  const calculateMonthBalance = (transactions) => {
    const monthTransactions = transactions.filter(txn => {
      const txnDate = new Date(txn.created_at);
      return txnDate.getMonth() + 1 === selectedMonth && txnDate.getFullYear() === selectedYear;
    });

    let monthIncoming = 0;
    let monthOutcoming = 0;
    monthTransactions.forEach(txn => {
      if (txn.category_type === 'INGRESO') {
        monthIncoming += parseFloat(txn.amount);
      }else if (txn.category_type === 'GASTO') {
        monthOutcoming += parseFloat(txn.amount);
      }
    });
    setMonthBalance(monthIncoming - monthOutcoming);
    setFilteredTransactions(monthTransactions);
  }

  const generateMonthlyData = (transactions) => {
    const monthlyStats = {};
    
    transactions.forEach(txn => {
      const txnDate = new Date(txn.created_at);
      const year = txnDate.getFullYear();
      const month = txnDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyStats[key]) {
        monthlyStats[key] = { month: key, ingresos: 0, gastos: 0 };
      }
      
      if (txn.category_type === 'INGRESO') {
        monthlyStats[key].ingresos += parseFloat(txn.amount);
      } else if (txn.category_type === 'GASTO') {
        monthlyStats[key].gastos += parseFloat(txn.amount);
      }
    });
    
    const sortedData = Object.values(monthlyStats)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
    
    setMonthlyData(sortedData);
  };

  const getData = async () => {
    setLoading(true);
    try {
      const [cardsData, accountsData, transactionsData] = await Promise.all([
        apiGet('/cards/user/' + user.id),
        apiGet('/accounts/user/' + user.id),
        apiGet('/transactions/user/' + user.id),
      ]);

      setCards(cardsData.data.data);
      setAccounts(accountsData.data.data);
      setTransactions(transactionsData.data.data);

      calculateBalances(transactionsData.data.data);
      calculateMonthBalance(transactionsData.data.data);
      generateMonthlyData(transactionsData.data.data);

      console.log('Cards:', cardsData.data.data);
      console.log('Accounts:', accountsData.data.data);
      console.log('Transactions:', transactionsData.data.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('No se pudieron cargar los datos. Por favor, inténtelo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };


  const [DateTime, setDateTime] = useState('');

  useEffect(() => {
    const obtenerFechaHora = () => {
      const fechaActual = new Date().toLocaleString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setDateTime(fechaActual);
    };

    obtenerFechaHora();
    getData();

  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      calculateMonthBalance(transactions);
    }
  }, [selectedMonth, selectedYear, transactions]);

  const handleTransactionSuccess = () => {
    getData();
  };

  const handleLogout = () => {
    swal({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro que deseas cerrar sesión?',
      icon: 'warning',
      buttons: ['Cancelar', 'Cerrar Sesión'],
      dangerMode: true,
    }).then((willLogout) => {
      if (willLogout) {
        logout();
      }
    });
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <StyledWrapper>
        <div className="error-container">
          <div className="error-banner">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <div className="error-text">
                <strong>Error:</strong> {error} <br />
                <span className="error-suggestion">Por favor, inténtelo de nuevo recargando la página.</span>
              </div>
            </div>
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="content-wrapper">
        <div className="header">
          <h1>Dashboard</h1>
          <p className="datetime">{DateTime}</p>
          <div className="controls-section">
            <ButtonMenu
              onNewIncome={() => setShowIncomeForm(true)}
              onNewExpense={() => setShowExpenseForm(true)}
              onLogout={handleLogout}
            />
          </div>
        </div>
        <div className="scrollable-content">
          <div className="content-grid">
            <div className='section'>
              <h2>Balance del Mes</h2>
              <p className="balance-amount">${monthBalance.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Ingresos', value: Math.max(0, incoming), color: '#10b981' },
                      { name: 'Gastos', value: Math.max(0, outcoming), color: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className='section'>
              <h2>Ingresos</h2>
              <p className="income-amount">${incoming.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Ingresos']} />
                  <Line 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className='section'>
              <h2>Gastos</h2>
              <p className="expense-amount">${outcoming.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Gastos']} />
                  <Line 
                    type="monotone" 
                    dataKey="gastos" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className='section'>
              <h2>Balance General</h2>
              <p className="balance-amount">${balance.toFixed(2)}</p>
              <div className="balance-comparison">
                <div className="comparison-item">
                  <span className="label">Balance del mes:</span>
                  <span className={`amount ${monthBalance >= 0 ? 'positive' : 'negative'}`}>
                    ${monthBalance.toFixed(2)}
                  </span>
                </div>
                <div className="comparison-item">
                  <span className="label">Balance general:</span>
                  <span className={`amount ${balance >= 0 ? 'positive' : 'negative'}`}>
                    ${balance.toFixed(2)}
                  </span>
                </div>
                <div className="comparison-item">
                  <span className="label">Diferencia:</span>
                  <span className={`amount ${(balance - monthBalance) >= 0 ? 'positive' : 'negative'}`}>
                    ${(balance - monthBalance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className='section'>
              <h2>Filtros de Tiempo</h2>
              <div className="filter-controls">
                <div className="filter-group">
                  <label>Mes y Año:</label>
                  <input 
                    type="month" 
                    value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`} 
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-');
                      setSelectedYear(parseInt(year));
                      setSelectedMonth(parseInt(month));
                    }} 
                  />
                </div>
                <div className="filter-group">
                  <label>Año:</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                <div className="selected-period">
                  <p><strong>Período seleccionado:</strong></p>
                  <p>{new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="content-grid-2">
            <div className='section'>
              <div className="section-header">
                <h2>Transacciones del Mes</h2>
                <span className="count">({filteredTransactions.length} de {transactions.length} total)</span>
              </div>
              <div className="table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Monto</th>
                      <th>Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    { filteredTransactions.map(txn => (
                      <tr key={txn.id} className={txn.category_type === 'INGRESO' ? 'income-row' : 'expense-row'}>
                        <td>{new Date(txn.created_at).toLocaleDateString('es-ES')}</td>
                        <td>
                          <span className={`type-badge ${txn.category_type === 'INGRESO' ? 'income' : 'expense'}`}>
                            {txn.type_name}
                          </span>
                        </td>
                        <td>{txn.description}</td>
                        <td className={txn.category_type === 'INGRESO' ? 'amount-income' : 'amount-expense'}>
                          {txn.category_type === 'INGRESO' ? '+' : '-'}${txn.amount}
                        </td>
                        <td>
                          <span className="category">{txn.category_type}: {txn.category_name || 'Sin categoría'}</span>
                        </td>
                      </tr>
                    )) }
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <div className="no-transactions">
                    <p>No hay transacciones en el período seleccionado</p>
                  </div>
                )}
              </div>
            </div>
            <div className='section'>
              <div className="section-header">
                <h2>Cuentas</h2>
                <span className="count">({accounts.length})</span>
              </div>
              <div className="accounts-grid">
                { accounts.map(account => (
                  <div key={account.id} className="account-card">
                    <div className="account-name">{account.account_name}</div>
                    <div className="account-balance">${account.balance}</div>
                    <div className="account-type">Cuenta Bancaria</div>
                  </div>
                )) }
                {accounts.length === 0 && (
                  <div className="no-data">
                    <p>No hay cuentas registradas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="content-grid-3">
            <div className='section'>
              <div className="section-header">
                <h2>Tarjetas</h2>
                <span className="count">({cards.length})</span>
              </div>
              <div className="cards-grid">
                { cards.map(card => (
                  <div key={card.id} className="card-item">
                    <div className="card-name">{card.card_name}</div>
                    <div className="card-balance">${card.current_balance}</div>
                    <div className="card-type">Tarjeta de Crédito</div>
                  </div>
                )) }
                {cards.length === 0 && (
                  <div className="no-data">
                    <p>No hay tarjetas registradas</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      <TransactionForm
        isOpen={showIncomeForm}
        onClose={() => setShowIncomeForm(false)}
        type="INGRESO"
        userId={user.id}
        accounts={accounts}
        cards={cards}
        onSuccess={handleTransactionSuccess}
      />

      <TransactionForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        type="GASTO"
        userId={user.id}
        accounts={accounts}
        cards={cards}
        onSuccess={handleTransactionSuccess}
      />
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`  
  font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;

  .content-wrapper {
    display: flex;
    flex-direction: column;
    width: calc(100vw - 40px);
    height: calc(100vh - 40px);
    margin: 10px;
    background: #d8dfe7;
    border-radius: 16px;
  }

  .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    background: #040f16;
    border-radius: 16px;
    padding: 10px 20px;
    margin: 10px 10px 0 10px;
    color: white;
    box-shadow: 0 8px 32px rgba(55, 71, 79, 0.3);
  }

  .header h1 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
  }

  .header .datetime {
    margin: 0;
    font-size: 0.9rem;
    opacity: 0.8;
    font-weight: 400;
  }

  .scrollable-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px;
    background: #040f16;
    border-radius: 16px;
    margin: 10px;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 300px;
    gap: 15px;
    margin: 10px;
  }

  .content-grid-2 {
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-template-rows: 500px;
    gap: 15px;
    margin: 15px 10px 10px 10px;
  }

  .content-grid-3 {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 200px;
    gap: 15px;
    margin: 15px 10px 10px 10px;
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 16px 24px;
    border: 1px solid #e9ecef;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
  }

  .section h2 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .count {
    background: #f3f4f6;
    color: #6b7280;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .balance-amount, .income-amount, .expense-amount {
    font-size: 2rem;
    font-weight: 700;
    margin: 8px 0 16px 0;
  }

  .balance-amount {
    color: #059669;
  }

  .income-amount {
    color: #10b981;
  }

  .expense-amount {
    color: #ef4444;
  }

  .balance-comparison {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }

  .comparison-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .comparison-item:last-child {
    border-bottom: none;
  }

  .comparison-item .label {
    font-weight: 500;
    color: #6b7280;
  }

  .comparison-item .amount {
    font-weight: 600;
  }

  .positive {
    color: #10b981;
  }

  .negative {
    color: #ef4444;
  }

  .filter-controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filter-group label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }

  .filter-group input,
  .filter-group select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .selected-period {
    background: #f9fafb;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .selected-period p {
    margin: 0;
    font-size: 0.875rem;
  }

  .table-container {
    max-height: 400px;
    overflow-y: auto;
  }

  .transactions-table {
    width: 100%;
    border-collapse: collapse;

    thead {
      background: #f9fafb;
      position: sticky;
      top: 0;
    }
    
    th, td {
      padding: 12px 16px;
      border: 1px solid #e9ecef;
      text-align: left;
    }

    th {
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }

    .income-row {
      background-color: #f0fdf4;
    }

    .expense-row {
      background-color: #fef2f2;
    }

    .type-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .type-badge.income {
      background: #dcfce7;
      color: #166534;
    }

    .type-badge.expense {
      background: #fee2e2;
      color: #991b1b;
    }

    .amount-income {
      color: #10b981;
      font-weight: 600;
    }

    .amount-expense {
      color: #ef4444;
      font-weight: 600;
    }

    .category {
      font-size: 0.875rem;
      color: #6b7280;
    }
  }

  .no-transactions, .no-data {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
    font-style: italic;
  }

  .accounts-grid, .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }

  .account-card, .card-item {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .account-card:hover, .card-item:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  .account-name, .card-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .account-balance, .card-balance {
    font-size: 1.25rem;
    font-weight: 700;
    color: #059669;
    margin-bottom: 4px;
  }

  .account-type, .card-type {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }


  .error-message {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    color: #721c24;
    padding: 16px 24px;
    border-radius: 12px;
    border: 1px solid #f1aeb5;
    text-align: center;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .content-grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
    }

    .content-grid-2 {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
    }

    .header {
      flex-direction: column;
      gap: 10px;
    }

    .balance-amount, .income-amount, .expense-amount {
      font-size: 1.5rem;
    }
  }
`;

export default Dashboard;