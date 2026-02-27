import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import styled from 'styled-components';
import { 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart,
  Area,
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
import AccountModal from '../components/AccountModal';
import CardModal from '../components/CardModal';
import MiniCalendar from '../components/MiniCalendar';


const Dashboard = () => {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [creditDebt, setCreditDebt] = useState(0);
  const [incoming, setIncoming] = useState(0);
  const [outcoming, setOutcoming] = useState(0);
  const [monthBalance, setMonthBalance] = useState(0);
  const [filteredIncoming, setFilteredIncoming] = useState(0);
  const [filteredOutcoming, setFilteredOutcoming] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Modales de cuentas
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Modales de tarjetas
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const calculateBalances = (transactions, accountsList, cardsList) => {
    let incomingTotal = 0;
    let outcomingTotal = 0;

    transactions.forEach(txn => {
      if (txn.category_type === 'INGRESO') {
        incomingTotal += parseFloat(txn.amount);
      } else if (txn.category_type === 'GASTO') {
        outcomingTotal += parseFloat(txn.amount);
      }
    });

    setIncoming(incomingTotal);
    setOutcoming(outcomingTotal);

    // Balance general = suma de saldos de todas las cuentas
    const totalAccountBalance = (accountsList || []).reduce(
      (sum, acc) => sum + parseFloat(acc.balance || 0), 0
    );
    setBalance(totalAccountBalance);

    // Deuda total tarjetas de crédito
    const totalDebt = (cardsList || []).reduce((sum, c) => {
      if (c.card_type === 'CREDITO') return sum + parseFloat(c.current_balance || 0);
      return sum;
    }, 0);
    setCreditDebt(totalDebt);
  };

  const calculateMonthBalance = (transactions) => {
    const monthTransactions = transactions.filter(txn => {
      const txnDate = new Date(txn.created_at);
      const matchMonth = txnDate.getMonth() + 1 === selectedMonth && txnDate.getFullYear() === selectedYear;
      if (!matchMonth) return false;
      if (selectedDay != null) return txnDate.getDate() === selectedDay;
      return true;
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
    setFilteredIncoming(monthIncoming);
    setFilteredOutcoming(monthOutcoming);
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

  // Generate daily data for the selected month (used by area charts when viewing a month)
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = {};
    for (let d = 1; d <= daysInMonth; d++) {
      days[d] = { day: d, label: `${d}`, ingresos: 0, gastos: 0 };
    }
    transactions.forEach(txn => {
      const txnDate = new Date(txn.created_at);
      if (txnDate.getMonth() + 1 === selectedMonth && txnDate.getFullYear() === selectedYear) {
        const d = txnDate.getDate();
        if (txn.category_type === 'INGRESO') {
          days[d].ingresos += parseFloat(txn.amount);
        } else if (txn.category_type === 'GASTO') {
          days[d].gastos += parseFloat(txn.amount);
        }
      }
    });
    return Object.values(days);
  }, [transactions, selectedMonth, selectedYear]);

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

      calculateBalances(transactionsData.data.data, accountsData.data.data, cardsData.data.data);
      calculateMonthBalance(transactionsData.data.data);
      generateMonthlyData(transactionsData.data.data);
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
  }, [selectedMonth, selectedYear, selectedDay, transactions]);

  const handleTransactionSuccess = () => {
    getData();
  };

  // ── Cuentas ───────────────────────────────────────────────────────
  const handleOpenNewAccount = () => { setEditingAccount(null); setShowAccountModal(true); };
  const handleOpenEditAccount = (account) => { setEditingAccount(account); setShowAccountModal(true); };
  const handleDeleteAccount = (account) => {
    swal({
      title: `¿Eliminar "${account.account_name}"?`,
      text: 'Se eliminará la cuenta y sus datos asociados. Esta acción no se puede deshacer.',
      icon: 'warning',
      buttons: ['Cancelar', 'Eliminar'],
      dangerMode: true,
    }).then(async (ok) => {
      if (!ok) return;
      try {
        const { apiDelete } = await import('../utils/api');
        const res = await apiDelete(`/accounts/${account.id}`);
        if (res.ok) {
          swal('Eliminada', 'La cuenta fue eliminada.', 'success');
          getData();
        } else {
          swal('Error', res.data?.error || 'No se pudo eliminar la cuenta.', 'error');
        }
      } catch { swal('Error', 'Error de conexión.', 'error'); }
    });
  };

  // ── Tarjetas ──────────────────────────────────────────────────────
  const handleOpenNewCard = () => { setEditingCard(null); setShowCardModal(true); };
  const handleOpenEditCard = (card) => { setEditingCard(card); setShowCardModal(true); };
  const handleDeleteCard = (card) => {
    swal({
      title: `¿Eliminar "${card.card_name}"?`,
      text: 'Se eliminará la tarjeta y sus datos asociados. Esta acción no se puede deshacer.',
      icon: 'warning',
      buttons: ['Cancelar', 'Eliminar'],
      dangerMode: true,
    }).then(async (ok) => {
      if (!ok) return;
      try {
        const { apiDelete } = await import('../utils/api');
        const res = await apiDelete(`/cards/${card.id}`);
        if (res.ok) {
          swal('Eliminada', 'La tarjeta fue eliminada.', 'success');
          getData();
        } else {
          swal('Error', res.data?.error || 'No se pudo eliminar la tarjeta.', 'error');
        }
      } catch { swal('Error', 'Error de conexión.', 'error'); }
    });
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

  // Compute which days-of-month have transactions (for calendar dots)
  const transactionDays = useMemo(() => {
    const daySet = new Set();
    transactions.forEach(txn => {
      const d = new Date(txn.created_at);
      if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear) {
        daySet.add(d.getDate());
      }
    });
    return [...daySet];
  }, [transactions, selectedMonth, selectedYear]);

  const handleCalendarMonthChange = (m, y) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setSelectedDay(null);
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
              onNewAccount={handleOpenNewAccount}
              onNewCard={handleOpenNewCard}
              onLogout={handleLogout}
            />
          </div>
        </div>
        <div className="scrollable-content">
          <div className="content-grid">
            <div className='section chart-donut-section'>
              <h2>{selectedDay ? `Balance del ${selectedDay} de ${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-ES', { month: 'long' })}` : 'Balance del Mes'}</h2>
              <p className="balance-amount">${monthBalance.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={[
                      { name: 'Ingresos', value: Math.max(0.01, filteredIncoming) },
                      { name: 'Gastos', value: Math.max(0.01, filteredOutcoming) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    cornerRadius={4}
                    dataKey="value"
                    labelLine={false}
                  >
                    <Cell fill="url(#gradIncome)" stroke="none" />
                    <Cell fill="url(#gradExpense)" stroke="none" />
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, '']} />
                  <Legend verticalAlign="bottom" height={30} iconType="circle" formatter={(value) => <span style={{fontSize: '0.75rem', color: '#374151'}}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className='section'>
              <h2>{selectedDay ? `Ingresos del día ${selectedDay}` : 'Ingresos del Mes'}</h2>
              <p className="income-amount">${filteredIncoming.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="areaIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={Math.ceil(dailyData.length / 10)} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Ingresos']}
                    labelFormatter={(label) => `Día ${label}`}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#areaIncome)"
                    dot={{ r: 2, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className='section'>
              <h2>{selectedDay ? `Gastos del día ${selectedDay}` : 'Gastos del Mes'}</h2>
              <p className="expense-amount">${filteredOutcoming.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="areaExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={Math.ceil(dailyData.length / 10)} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Gastos']}
                    labelFormatter={(label) => `Día ${label}`}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="gastos"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fill="url(#areaExpense)"
                    dot={{ r: 2, fill: '#fff', stroke: '#ef4444', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#ef4444' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className='section finance-summary-section'>
              <h2>Resumen Financiero</h2>
              <div className="finance-net">
                <span className="finance-net-label">Patrimonio neto</span>
                <span className={`finance-net-amount ${(balance - creditDebt) >= 0 ? 'positive' : 'negative'}`}>
                  ${(balance - creditDebt).toFixed(2)}
                </span>
              </div>
              <div className="finance-row">
                <div className="finance-block positive-block">
                  <span className="finance-block-icon">🏦</span>
                  <span className="finance-block-label">Cuentas</span>
                  <span className="finance-block-amount positive">${balance.toFixed(2)}</span>
                </div>
                <div className="finance-block negative-block">
                  <span className="finance-block-icon">💳</span>
                  <span className="finance-block-label">Deuda tarjetas</span>
                  <span className="finance-block-amount negative">-${creditDebt.toFixed(2)}</span>
                </div>
              </div>
              <div className="finance-accounts-mini">
                {accounts.map(acc => {
                  const pct = balance > 0 ? (parseFloat(acc.balance) / balance) * 100 : 0;
                  return (
                    <div key={acc.id} className="finance-acc-row">
                      <span className="finance-acc-name">{acc.account_name.length > 18 ? acc.account_name.slice(0, 18) + '…' : acc.account_name}</span>
                      <div className="finance-acc-bar-bg">
                        <div className="finance-acc-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="finance-acc-val">${parseFloat(acc.balance).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className='section calendar-section'>
              <h2>Calendario</h2>
              <MiniCalendar
                month={selectedMonth}
                year={selectedYear}
                selectedDay={selectedDay}
                onMonthChange={handleCalendarMonthChange}
                onDaySelect={setSelectedDay}
                transactionDays={transactionDays}
              />
            </div>
          </div>
          <div className="content-grid-2">
            <div className='section'>
              <div className="section-header">
                <h2>{selectedDay ? `Transacciones del ${selectedDay}/${selectedMonth}/${selectedYear}` : 'Transacciones del Mes'}</h2>
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
                <div className="section-header-actions">
                  <span className="count">({accounts.length})</span>
                </div>
              </div>
              <div className="accounts-grid">
                { accounts.map(account => {
                  const bal = parseFloat(account.balance);
                  const pct = balance > 0 ? ((bal / balance) * 100) : 0;
                  const isSavings = account.account_type === 'AHORRO';
                  return (
                    <div key={account.id} className={`account-card ${isSavings ? 'savings' : 'checking'}`}>
                      <div className="account-card-body">
                        <div className="card-row-top">
                          <div className="account-name">{account.account_name}</div>
                          <div className="item-actions">
                            <button className="action-btn edit" title="Editar" onClick={() => handleOpenEditAccount(account)}>&#9998;</button>
                            <button className="action-btn delete" title="Eliminar" onClick={() => handleDeleteAccount(account)}>&times;</button>
                          </div>
                        </div>
                        <div className="account-balance-display">
                          <span className="account-currency">Q</span>
                          <span className="account-amount">{bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="account-footer">
                          <span className="account-type-badge">{isSavings ? 'Ahorro' : 'Monetaria'}</span>
                          {balance > 0 && <span className="account-pct">{pct.toFixed(1)}%</span>}
                        </div>
                        {balance > 0 && (
                          <div className="account-bar-bg">
                            <div className="account-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) }
                {accounts.length === 0 && (
                  <div className="no-data">
                    <p>No hay cuentas registradas</p>
                    <button className="btn-add-empty" onClick={handleOpenNewAccount}>+ Crear primera cuenta</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="content-grid-3">
            <div className='section'>
              <div className="section-header">
                <h2>Tarjetas</h2>
                <div className="section-header-actions">
                  <span className="count">({cards.length})</span>
                </div>
              </div>
              <div className="cards-grid">
                { cards.map(card => (
                  <div key={card.id} className={`card-item ${card.card_type === 'CREDITO' ? 'credit' : 'debit'}`}>
                    <div className="card-row-top">
                      <div className="card-name">{card.card_name}</div>
                      <div className="item-actions">
                        <button className="action-btn edit" title="Editar" onClick={() => handleOpenEditCard(card)}>&#9998;</button>
                        <button className="action-btn delete" title="Eliminar" onClick={() => handleDeleteCard(card)}>&times;</button>
                      </div>
                    </div>
                    {card.card_type === 'CREDITO' ? (
                      <>
                        <div className="card-balance-row">
                          <span className="balance-label">Usado:</span>
                          <span className="card-balance used">${parseFloat(card.current_balance).toFixed(2)}</span>
                        </div>
                        <div className="card-balance-row">
                          <span className="balance-label">Límite:</span>
                          <span className="card-limit">${parseFloat(card.credit_limit).toFixed(2)}</span>
                        </div>
                        <div className="credit-bar">
                          <div
                            className="credit-fill"
                            style={{ width: `${Math.min(100, (card.current_balance / card.credit_limit) * 100)}%` }}
                          />
                        </div>
                        <div className="card-type credit-badge">💳 Crédito</div>
                      </>
                    ) : (
                      <>
                        <div className="card-balance">
                          ${parseFloat(accounts.find(a => a.id === card.account_id)?.balance ?? 0).toFixed(2)}
                        </div>
                        <div className="card-type debit-badge">🏦 Débito — Saldo de cuenta</div>
                      </>
                    )}
                    {card.expiry_date && (
                      <div className="card-due">
                        Vence: {card.expiry_date}
                      </div>
                    )}
                    {card.cut_off_day && (
                      <div className="card-due">
                        Corte: día {card.cut_off_day} de cada mes
                      </div>
                    )}
                  </div>
                )) }
                {cards.length === 0 && (
                  <div className="no-data">
                    <p>No hay tarjetas registradas</p>
                    <button className="btn-add-empty" onClick={handleOpenNewCard}>+ Agregar tarjeta</button>
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

      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSuccess={getData}
        userId={user.id}
        account={editingAccount}
      />

      <CardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        onSuccess={getData}
        userId={user.id}
        accounts={accounts}
        card={editingCard}
      />
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`  
  font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;

  .content-wrapper {
    display: flex;
    flex-direction: column;
    width: calc(100vw - 20px);
    height: calc(100vh - 20px);
    margin: 10px;
    background: #d8dfe7;
    border-radius: 16px;
    overflow: hidden;
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
    grid-auto-rows: minmax(0, auto);
    gap: 15px;
    margin: 10px;
  }

  .content-grid-2 {
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-auto-rows: minmax(0, auto);
    gap: 15px;
    margin: 15px 10px 10px 10px;
  }

  .content-grid-3 {
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(0, auto);
    gap: 15px;
    margin: 15px 10px 10px 10px;
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
    overflow: hidden;
    min-width: 0;
  }

  /* Ensure recharts SVGs stay inside their containers */
  .section .recharts-responsive-container {
    min-width: 0;
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

  /* ── Resumen Financiero card ── */
  .finance-summary-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .finance-net {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0 6px;
  }

  .finance-net-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .finance-net-amount {
    font-size: 1.6rem;
    font-weight: 800;
  }

  .finance-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .finance-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 6px;
    border-radius: 8px;
    gap: 2px;
  }

  .positive-block { background: #f0fdf4; }
  .negative-block { background: #fef2f2; }

  .finance-block-icon {
    font-size: 1.1rem;
  }

  .finance-block-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .finance-block-amount {
    font-size: 0.95rem;
    font-weight: 700;
  }

  .finance-accounts-mini {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 2px;
  }

  .finance-acc-row {
    display: grid;
    grid-template-columns: 1fr 60px 50px;
    align-items: center;
    gap: 6px;
  }

  .finance-acc-name {
    font-size: 0.68rem;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .finance-acc-bar-bg {
    height: 5px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }

  .finance-acc-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #34d399, #059669);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .finance-acc-val {
    font-size: 0.68rem;
    font-weight: 600;
    color: #059669;
    text-align: right;
  }

  .filter-controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .calendar-section {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
  }

  .calendar-section h2 {
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .chart-donut-section .recharts-wrapper {
    margin: 0 auto;
  }

  .table-container {
    max-height: 400px;
    overflow-y: auto;
    overflow-x: auto;
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

  .card-item {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .card-item:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  /* ── Account Cards ── */
  .account-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.25s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .account-card.savings { border-left: 3px solid #059669; }
  .account-card.checking { border-left: 3px solid #3b82f6; }

  .account-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border-color: #d1d5db;
  }

  .account-card.savings:hover { border-left-color: #059669; }
  .account-card.checking:hover { border-left-color: #3b82f6; }

  .account-card-body {
    padding: 14px 16px 16px;
  }

  .account-balance-display {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin: 10px 0 8px;
  }

  .account-currency {
    font-size: 0.9rem;
    font-weight: 600;
    color: #059669;
  }

  .account-amount {
    font-size: 1.35rem;
    font-weight: 800;
    color: #059669;
  }

  .account-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .account-type-badge {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .account-card.savings .account-type-badge {
    background: #f0fdf4;
    color: #059669;
  }

  .account-card.checking .account-type-badge {
    background: #eff6ff;
    color: #2563eb;
  }

  .account-pct {
    font-size: 0.72rem;
    font-weight: 700;
    color: #9ca3af;
  }

  .account-bar-bg {
    height: 4px;
    background: #f3f4f6;
    border-radius: 2px;
    overflow: hidden;
  }

  .account-card.savings .account-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #34d399, #059669);
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  .account-card.checking .account-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #60a5fa, #3b82f6);
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  .card-item.credit { border-left: 3px solid #8b5cf6; }
  .card-item.debit  { border-left: 3px solid #3b82f6; }

  .section-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .btn-add {
    padding: 5px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 7px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    &:hover { background: #2563eb; }
  }

  .btn-add-empty {
    margin-top: 10px;
    padding: 8px 18px;
    background: #eff6ff;
    color: #2563eb;
    border: 1px dashed #93c5fd;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    &:hover { background: #dbeafe; }
  }

  .card-row-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .item-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .account-card:hover .item-actions,
  .card-item:hover .item-actions { opacity: 1; }

  .action-btn {
    width: 26px; height: 26px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    font-family: inherit;
    &.edit   { background: #ede9fe; color: #5b21b6; &:hover { background: #ddd6fe; } }
    &.delete { background: #fee2e2; color: #991b1b; &:hover { background: #fecaca; } }
  }

  .account-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.9rem;
  }

  .card-name {
    font-weight: 600;
    color: #1f2937;
  }

  .card-balance {
    font-size: 1.25rem;
    font-weight: 700;
    color: #059669;
    margin-bottom: 4px;
  }

  .card-balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
  }

  .balance-label { font-size: 0.75rem; color: #6b7280; }

  .card-balance.used { font-size: 1rem; font-weight: 700; color: #dc2626; }
  .card-limit { font-size: 0.85rem; font-weight: 600; color: #374151; }

  .credit-bar {
    height: 5px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    margin: 6px 0;
  }
  .credit-fill {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b, #ef4444);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .credit-badge, .debit-badge {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }
  .credit-badge { color: #5b21b6; }
  .debit-badge  { color: #1d4ed8; }

  .card-due {
    font-size: 0.72rem;
    color: #6b7280;
    margin-top: 4px;
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

  /* ────── Mobile (phone) ────── */
  @media (max-width: 768px) {
    .content-wrapper {
      width: 100vw;
      height: 100vh;
      margin: 0;
      border-radius: 0;
    }

    .header {
      flex-direction: column;
      gap: 6px;
      margin: 0;
      border-radius: 0;
      padding: 10px 14px;
    }

    .header h1 {
      font-size: 1.3rem;
    }

    .scrollable-content {
      margin: 0;
      border-radius: 0;
      padding: 8px;
    }

    .content-grid {
      grid-template-columns: 1fr 1fr;
      grid-auto-rows: auto;
      gap: 10px;
      margin: 6px;
    }

    /* Donut chart spans full width on mobile */
    .content-grid .chart-donut-section {
      grid-column: 1 / -1;
    }

    .content-grid-2 {
      grid-template-columns: 1fr;
      grid-auto-rows: auto;
      gap: 10px;
      margin: 10px 6px 6px 6px;
    }

    .content-grid-3 {
      grid-template-columns: 1fr;
      grid-auto-rows: auto;
      gap: 10px;
      margin: 10px 6px 6px 6px;
    }

    .section {
      padding: 12px 14px;
    }

    .section h2 {
      font-size: 1rem;
      margin-bottom: 8px;
    }

    .balance-amount, .income-amount, .expense-amount {
      font-size: 1.4rem;
      margin: 4px 0 10px 0;
    }

    .comparison-item {
      padding: 6px 0;
    }

    .comparison-item .label {
      font-size: 0.78rem;
    }

    .comparison-item .amount {
      font-size: 0.85rem;
    }

    .table-container {
      max-height: 350px;
    }

    .transactions-table {
      min-width: 520px; /* force horizontal scroll for readability */
    }

    .transactions-table th, .transactions-table td {
      padding: 8px 10px;
      font-size: 0.8rem;
    }

    .accounts-grid, .cards-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .section-header {
      flex-wrap: wrap;
      gap: 6px;
    }

    .section-header h2 {
      font-size: 1rem;
    }

    .item-actions {
      opacity: 1; /* always show on mobile (no hover) */
    }

    .calendar-section {
      padding: 10px 12px;
    }
  }
`;

export default Dashboard;