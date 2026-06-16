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
  Bar,
  ReferenceLine
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


const CardChipIcon = () => (
  <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="31" height="21" rx="4" stroke="currentColor" strokeOpacity="0.85" />
    <line x1="0.5" y1="7.3" x2="31.5" y2="7.3" stroke="currentColor" strokeOpacity="0.85" />
    <line x1="0.5" y1="14.6" x2="31.5" y2="14.6" stroke="currentColor" strokeOpacity="0.85" />
    <line x1="11" y1="0.5" x2="11" y2="21.5" stroke="currentColor" strokeOpacity="0.85" />
    <line x1="21" y1="0.5" x2="21" y2="21.5" stroke="currentColor" strokeOpacity="0.85" />
  </svg>
);

// Decorative flat outline triangle used on account/card art tiles
const TriangleDecor = ({ className }) => (
  <svg className={className} width="92" height="80" viewBox="0 0 92 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M46 4 L88 76 L4 76 Z" stroke="currentColor" strokeWidth="3" />
  </svg>
);

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

  // Promedio diario y día pico, para enriquecer los charts de ingresos/gastos
  const incomeStats = useMemo(() => {
    const peak = dailyData.reduce((max, d) => (d.ingresos > max.ingresos ? d : max), { day: null, ingresos: 0 });
    return { avg: dailyData.length ? filteredIncoming / dailyData.length : 0, peakDay: peak.day, peakValue: peak.ingresos };
  }, [dailyData, filteredIncoming]);

  const expenseStats = useMemo(() => {
    const peak = dailyData.reduce((max, d) => (d.gastos > max.gastos ? d : max), { day: null, gastos: 0 });
    return { avg: dailyData.length ? filteredOutcoming / dailyData.length : 0, peakDay: peak.day, peakValue: peak.gastos };
  }, [dailyData, filteredOutcoming]);

  // % del ingreso que queda como ahorro, mostrado en el centro del donut
  const savingsRate = filteredIncoming > 0 ? ((filteredIncoming - filteredOutcoming) / filteredIncoming) * 100 : null;

  // Tendencia de balance neto mensual (ingresos - gastos), para el sparkline de Resumen Financiero
  const netTrendData = useMemo(() => (
    monthlyData.slice(-6).map(m => ({ month: m.month, net: m.ingresos - m.gastos }))
  ), [monthlyData]);

  const assetsDebtTotal = balance + creditDebt;
  const assetsPct = assetsDebtTotal > 0 ? (balance / assetsDebtTotal) * 100 : 50;
  const debtPct = assetsDebtTotal > 0 ? (creditDebt / assetsDebtTotal) * 100 : 50;

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
        <div className="bg-glow glow-1" />
        <div className="bg-glow glow-2" />
        <div className="header">
          <div className="header-left">
            <div className="avatar">{(user?.username || '?').charAt(0).toUpperCase()}</div>
            <div className="header-titles">
              <h1>Hola, {user?.username || 'bienvenido'} <span className="wave">👋</span></h1>
              <p className="datetime">{DateTime}</p>
            </div>
          </div>
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
            <div className='section chart-donut-section accent-blue'>
              <h2><span className="icon-badge accent-blue">📊</span>{selectedDay ? `Balance del ${selectedDay} de ${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-ES', { month: 'long' })}` : 'Balance del Mes'}</h2>
              <p className={`balance-amount ${monthBalance >= 0 ? 'positive' : 'negative'}`}>${monthBalance.toFixed(2)}</p>
              <div className="donut-wrap">
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
                      <filter id="donutShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
                      </filter>
                    </defs>
                    <Pie
                      data={[
                        { name: 'Ingresos', value: Math.max(0.01, filteredIncoming) },
                        { name: 'Gastos', value: Math.max(0.01, filteredOutcoming) }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={5}
                      cornerRadius={6}
                      dataKey="value"
                      labelLine={false}
                      style={{ filter: 'url(#donutShadow)' }}
                    >
                      <Cell fill="url(#gradIncome)" stroke="none" />
                      <Cell fill="url(#gradExpense)" stroke="none" />
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, '']} />
                    <Legend verticalAlign="bottom" height={30} iconType="circle" formatter={(value) => <span style={{fontSize: '0.75rem', color: '#374151'}}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <span className="donut-center-value">{savingsRate === null ? '—' : `${savingsRate.toFixed(0)}%`}</span>
                  <span className="donut-center-label">ahorro</span>
                </div>
              </div>
            </div>
            <div className='section accent-green'>
              <h2><span className="icon-badge accent-green">📈</span>{selectedDay ? `Ingresos del día ${selectedDay}` : 'Ingresos del Mes'}</h2>
              <p className="income-amount">${filteredIncoming.toFixed(2)}</p>
              <div className="chart-stat-row">
                <div className="chart-stat">
                  <span className="chart-stat-label">Promedio/día</span>
                  <span className="chart-stat-value income">${incomeStats.avg.toFixed(2)}</span>
                </div>
                <div className="chart-stat">
                  <span className="chart-stat-label">Día más alto</span>
                  <span className="chart-stat-value income">{incomeStats.peakDay ? `${incomeStats.peakDay} · $${incomeStats.peakValue.toFixed(2)}` : '—'}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="areaIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={Math.ceil(dailyData.length / 10)} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  {incomeStats.avg > 0 && (
                    <ReferenceLine y={incomeStats.avg} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
                  )}
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
            <div className='section accent-red'>
              <h2><span className="icon-badge accent-red">📉</span>{selectedDay ? `Gastos del día ${selectedDay}` : 'Gastos del Mes'}</h2>
              <p className="expense-amount">${filteredOutcoming.toFixed(2)}</p>
              <div className="chart-stat-row">
                <div className="chart-stat">
                  <span className="chart-stat-label">Promedio/día</span>
                  <span className="chart-stat-value expense">${expenseStats.avg.toFixed(2)}</span>
                </div>
                <div className="chart-stat">
                  <span className="chart-stat-label">Día más alto</span>
                  <span className="chart-stat-value expense">{expenseStats.peakDay ? `${expenseStats.peakDay} · $${expenseStats.peakValue.toFixed(2)}` : '—'}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="areaExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={Math.ceil(dailyData.length / 10)} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  {expenseStats.avg > 0 && (
                    <ReferenceLine y={expenseStats.avg} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                  )}
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
            <div className='section finance-summary-section accent-purple'>
              <h2><span className="icon-badge accent-purple">💎</span>Resumen Financiero</h2>
              <div className="finance-net">
                <span className="finance-net-label">Patrimonio neto</span>
                <span className={`finance-net-amount ${(balance - creditDebt) >= 0 ? 'positive' : 'negative'}`}>
                  ${(balance - creditDebt).toFixed(2)}
                </span>
                {netTrendData.length > 1 && (
                  <div className="finance-net-trend">
                    <ResponsiveContainer width="100%" height={36}>
                      <AreaChart data={netTrendData}>
                        <defs>
                          <linearGradient id="netTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={(balance - creditDebt) >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={(balance - creditDebt) >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="net"
                          stroke={(balance - creditDebt) >= 0 ? '#10b981' : '#ef4444'}
                          strokeWidth={2}
                          fill="url(#netTrendGrad)"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <span className="finance-net-trend-label">últimos {netTrendData.length} meses</span>
                  </div>
                )}
              </div>

              <div className="finance-split-bar">
                <div className="finance-split-fill assets" style={{ width: `${assetsPct}%` }} title={`Cuentas ${assetsPct.toFixed(0)}%`} />
                <div className="finance-split-fill debt" style={{ width: `${debtPct}%` }} title={`Deuda ${debtPct.toFixed(0)}%`} />
              </div>

              <div className="finance-row">
                <div className="finance-block positive-block">
                  <span className="finance-block-icon">🏦</span>
                  <div className="finance-block-text">
                    <span className="finance-block-label">Cuentas · {assetsPct.toFixed(0)}%</span>
                    <span className="finance-block-amount positive">${balance.toFixed(2)}</span>
                  </div>
                </div>
                <div className="finance-block negative-block">
                  <span className="finance-block-icon">💳</span>
                  <div className="finance-block-text">
                    <span className="finance-block-label">Deuda · {debtPct.toFixed(0)}%</span>
                    <span className="finance-block-amount negative">-${creditDebt.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="finance-accounts-mini">
                {accounts.map(acc => {
                  const pct = balance > 0 ? (parseFloat(acc.balance) / balance) * 100 : 0;
                  const art = acc.account_art || 'mint';
                  return (
                    <div key={acc.id} className="finance-acc-row">
                      <span className={`finance-acc-dot art-${art}`} />
                      <span className="finance-acc-name">{acc.account_name.length > 16 ? acc.account_name.slice(0, 16) + '…' : acc.account_name}</span>
                      <div className="finance-acc-bar-bg">
                        <div className={`finance-acc-bar-fill art-${art}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="finance-acc-val">${parseFloat(acc.balance).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className='section calendar-section accent-amber'>
              <h2><span className="icon-badge accent-amber">🗓️</span>Calendario</h2>
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
                <h2><span className="icon-badge accent-slate">🧾</span>{selectedDay ? `Transacciones del ${selectedDay}/${selectedMonth}/${selectedYear}` : 'Transacciones del Mes'}</h2>
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
                          <span className="category"><span className={`cat-dot ${txn.category_type === 'INGRESO' ? 'income' : 'expense'}`} />{txn.category_name || 'Sin categoría'}</span>
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
                <h2><span className="icon-badge accent-emerald">🏦</span>Cuentas</h2>
                <div className="section-header-actions">
                  <button className="btn-add" onClick={handleOpenNewAccount}>+ Nueva</button>
                  <span className="count">({accounts.length})</span>
                </div>
              </div>
              <div className="accounts-grid">
                { accounts.map(account => {
                  const bal = parseFloat(account.balance);
                  const pct = balance > 0 ? ((bal / balance) * 100) : 0;
                  const isSavings = account.account_type === 'AHORRO';
                  return (
                    <div key={account.id} className={`account-card art-${account.account_art || 'mint'}`}>
                      <TriangleDecor className="account-card-triangle" />
                      <span className="account-card-circle" />
                      <div className="account-card-body">
                        <div className="card-row-top">
                          <div className="account-chip-icon">{isSavings ? '🐷' : '💼'}</div>
                          <div className="item-actions">
                            <button className="action-btn edit" title="Editar" onClick={() => handleOpenEditAccount(account)}>&#9998;</button>
                            <button className="action-btn delete" title="Eliminar" onClick={() => handleDeleteAccount(account)}>&times;</button>
                          </div>
                        </div>
                        <div className="account-name">{account.account_name}</div>
                        <div className="account-balance-display">
                          <span className="account-currency">Q</span>
                          <span className="account-amount">{bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="account-footer">
                          <span className="account-type-badge">{isSavings ? 'Ahorro' : 'Monetaria'}</span>
                          {balance > 0 && <span className="account-pct">{pct.toFixed(1)}% del total</span>}
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
                    <span className="no-data-icon">🏦</span>
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
                <h2><span className="icon-badge accent-violet">💳</span>Tarjetas</h2>
                <div className="section-header-actions">
                  <button className="btn-add" onClick={handleOpenNewCard}>+ Nueva</button>
                  <span className="count">({cards.length})</span>
                </div>
              </div>
              <div className="cards-grid">
                { cards.map(card => {
                  const isCredit = card.card_type === 'CREDITO';
                  const usagePct = isCredit ? Math.min(100, (card.current_balance / card.credit_limit) * 100) : 0;
                  return (
                  <div key={card.id} className={`card-item art-${card.card_art || 'aurora'}`}>
                    <TriangleDecor className="card-item-triangle" />
                    <span className="card-item-blob b1" />
                    <span className="card-item-blob b2" />
                    <span className="card-item-blob b3" />
                    <div className="card-row-top">
                      <CardChipIcon />
                      <div className="item-actions">
                        <button className="action-btn edit light" title="Editar" onClick={() => handleOpenEditCard(card)}>&#9998;</button>
                        <button className="action-btn delete light" title="Eliminar" onClick={() => handleDeleteCard(card)}>&times;</button>
                      </div>
                    </div>
                    <div className="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;{card.id.slice(-4).toUpperCase()}</div>
                    <div className="card-name">{card.card_name}</div>
                    {isCredit ? (
                      <>
                        <div className="card-balance-row">
                          <span className="balance-label">Usado</span>
                          <span className="balance-label">Límite</span>
                        </div>
                        <div className="card-balance-row">
                          <span className="card-balance used">${parseFloat(card.current_balance).toFixed(2)}</span>
                          <span className="card-limit">${parseFloat(card.credit_limit).toFixed(2)}</span>
                        </div>
                        <div className="credit-bar">
                          <div className="credit-fill" style={{ width: `${usagePct}%` }} />
                        </div>
                      </>
                    ) : (
                      <div className="card-balance-row">
                        <span className="balance-label">Saldo de cuenta</span>
                        <span className="card-balance">${parseFloat(accounts.find(a => a.id === card.account_id)?.balance ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="card-bottom-row">
                      <span className="card-type">{isCredit ? 'CRÉDITO' : 'DÉBITO'}</span>
                      {card.expiry_date && <span className="card-expiry">VENCE {card.expiry_date}</span>}
                    </div>
                    {card.cut_off_day && (
                      <div className="card-due">
                        Corte: día {card.cut_off_day} de cada mes
                      </div>
                    )}
                  </div>
                  );
                }) }
                {cards.length === 0 && (
                  <div className="no-data">
                    <span className="no-data-icon">💳</span>
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
    position: relative;
    display: flex;
    flex-direction: column;
    width: calc(100vw - 20px);
    height: calc(100vh - 20px);
    margin: 10px;
    background: #040f16;
    border-radius: 16px;
    overflow: hidden;
  }

  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
    opacity: 0.35;
  }

  .glow-1 {
    width: 420px;
    height: 420px;
    top: -120px;
    left: -80px;
    background: radial-gradient(circle, #2563eb, transparent 70%);
  }

  .glow-2 {
    width: 480px;
    height: 480px;
    bottom: -160px;
    right: -100px;
    background: radial-gradient(circle, #7c3aed, transparent 70%);
  }

  .header {
    position: relative;
    z-index: 20;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 14px 22px;
    margin: 10px 10px 0 10px;
    color: white;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .avatar {
    width: 46px;
    height: 46px;
    flex-shrink: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.1rem;
    color: white;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  }

  .header-titles { display: flex; flex-direction: column; gap: 2px; }

  .header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: capitalize;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .wave {
    display: inline-block;
    animation: wave 2.2s infinite;
    transform-origin: 70% 70%;
  }

  @keyframes wave {
    0%, 60%, 100% { transform: rotate(0deg); }
    10% { transform: rotate(14deg); }
    20% { transform: rotate(-8deg); }
    30% { transform: rotate(14deg); }
    40% { transform: rotate(-4deg); }
  }

  .header .datetime {
    margin: 0;
    font-size: 0.82rem;
    opacity: 0.6;
    font-weight: 400;
    text-transform: capitalize;
  }

  .scrollable-content {
    position: relative;
    z-index: 1;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px;
    background: transparent;
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
    position: relative;
    background: white;
    border-radius: 14px;
    padding: 18px 20px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.04);
    border: 1px solid #eef0f4;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    overflow: hidden;
    min-width: 0;
  }

  .section::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, #94a3b8, #cbd5e1);
    opacity: 0.7;
  }

  .section.accent-blue::before    { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
  .section.accent-green::before   { background: linear-gradient(90deg, #059669, #34d399); }
  .section.accent-red::before     { background: linear-gradient(90deg, #dc2626, #f87171); }
  .section.accent-purple::before  { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
  .section.accent-amber::before   { background: linear-gradient(90deg, #d97706, #fbbf24); }

  .section:hover {
    transform: translateY(-3px);
    box-shadow:
      0 24px 70px rgba(0, 0, 0, 0.1),
      0 10px 36px rgba(0, 0, 0, 0.05);
  }

  .section.accent-blue:hover   { box-shadow: 0 24px 60px rgba(59,130,246,0.18), 0 8px 24px rgba(0,0,0,0.05); }
  .section.accent-green:hover  { box-shadow: 0 24px 60px rgba(5,150,105,0.18), 0 8px 24px rgba(0,0,0,0.05); }
  .section.accent-red:hover    { box-shadow: 0 24px 60px rgba(220,38,38,0.18), 0 8px 24px rgba(0,0,0,0.05); }
  .section.accent-purple:hover { box-shadow: 0 24px 60px rgba(124,58,237,0.18), 0 8px 24px rgba(0,0,0,0.05); }
  .section.accent-amber:hover  { box-shadow: 0 24px 60px rgba(217,119,6,0.18), 0 8px 24px rgba(0,0,0,0.05); }

  /* Ensure recharts SVGs stay inside their containers */
  .section .recharts-responsive-container {
    min-width: 0;
  }

  .section h2 {
    margin: 0 0 16px 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .icon-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .icon-badge.accent-blue    { background: #eff6ff; }
  .icon-badge.accent-green   { background: #f0fdf4; }
  .icon-badge.accent-red     { background: #fef2f2; }
  .icon-badge.accent-purple  { background: #f5f3ff; }
  .icon-badge.accent-amber   { background: #fffbeb; }
  .icon-badge.accent-slate   { background: #f1f5f9; }
  .icon-badge.accent-emerald { background: #ecfdf5; }
  .icon-badge.accent-violet  { background: #f5f3ff; }

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
    gap: 12px;
  }

  .finance-net {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 0 2px;
  }

  .finance-net-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .finance-net-amount {
    font-size: 1.7rem;
    font-weight: 800;
  }

  .finance-net-trend {
    position: relative;
    width: 100%;
    margin-top: 2px;
  }

  .finance-net-trend-label {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 0.6rem;
    font-weight: 600;
    color: #b0b3bb;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    pointer-events: none;
  }

  .finance-split-bar {
    display: flex;
    width: 100%;
    height: 8px;
    border-radius: 5px;
    overflow: hidden;
    background: #f1f2f5;
  }

  .finance-split-fill {
    height: 100%;
    transition: width 0.5s ease;
  }
  .finance-split-fill.assets { background: #10b981; }
  .finance-split-fill.debt   { background: #ef4444; }

  .finance-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .finance-block {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border-radius: 10px;
  }

  .positive-block { background: #f0fdf4; }
  .negative-block { background: #fef2f2; }

  .finance-block-icon {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
  }

  .positive-block .finance-block-icon { background: #dcfce7; }
  .negative-block .finance-block-icon { background: #fee2e2; }

  .finance-block-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .finance-block-label {
    font-size: 0.64rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }

  .finance-block-amount {
    font-size: 0.92rem;
    font-weight: 700;
  }

  .finance-accounts-mini {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-top: 2px;
  }

  .finance-acc-row {
    display: grid;
    grid-template-columns: 7px 1fr 60px 50px;
    align-items: center;
    gap: 7px;
  }

  .finance-acc-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .finance-acc-dot.art-mint     { background: #059669; }
  .finance-acc-dot.art-lavender { background: #6366f1; }
  .finance-acc-dot.art-peach    { background: #fb923c; }

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
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .finance-acc-bar-fill.art-mint     { background: #059669; }
  .finance-acc-bar-fill.art-lavender { background: #6366f1; }
  .finance-acc-bar-fill.art-peach    { background: #fb923c; }

  .finance-acc-val {
    font-size: 0.68rem;
    font-weight: 600;
    color: #374151;
    text-align: right;
  }

  /* ── Donut center label ── */
  .donut-wrap {
    position: relative;
  }

  .donut-center {
    position: absolute;
    top: 43%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }

  .donut-center-value {
    font-size: 1.3rem;
    font-weight: 800;
    color: #1f2937;
    line-height: 1.1;
  }

  .donut-center-label {
    font-size: 0.62rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  /* ── Income/Expense chart stat chips ── */
  .chart-stat-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .chart-stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 6px 10px;
    border-radius: 8px;
    background: #f8fafc;
  }

  .chart-stat-label {
    font-size: 0.62rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .chart-stat-value {
    font-size: 0.82rem;
    font-weight: 700;
  }
  .chart-stat-value.income  { color: #059669; }
  .chart-stat-value.expense { color: #dc2626; }

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
    border-radius: 10px;
    border: 1px solid #eef0f4;
  }

  .transactions-table {
    width: 100%;
    border-collapse: collapse;

    thead {
      background: #f8fafc;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    th, td {
      padding: 12px 16px;
      border-bottom: 1px solid #eef0f4;
      text-align: left;
    }

    th {
      font-weight: 700;
      color: #475569;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    tbody tr {
      transition: background-color 0.15s ease;
    }

    .income-row {
      background-color: #f6fdf9;
    }

    .expense-row {
      background-color: #fef9f9;
    }

    .income-row:hover {
      background-color: #ecfdf5;
    }

    .expense-row:hover {
      background-color: #fef2f2;
    }

    .type-badge {
      padding: 4px 9px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
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
      display: flex;
      align-items: center;
    }

    .cat-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 7px;
      flex-shrink: 0;
    }
    .cat-dot.income { background: #10b981; }
    .cat-dot.expense { background: #ef4444; }
  }

  .no-transactions, .no-data {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
    font-style: italic;
  }

  .no-data-icon {
    display: block;
    font-size: 2.2rem;
    margin-bottom: 8px;
    opacity: 0.5;
    font-style: normal;
  }

  .accounts-grid, .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }

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
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
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
    &.light  { background: rgba(255,255,255,0.16); color: #fff; backdrop-filter: blur(2px); }
    &.light.edit:hover   { background: rgba(255,255,255,0.32); }
    &.light.delete:hover { background: rgba(239,68,68,0.65); }
  }

  /* ── Account Cards: flat pastel art tiles ── */
  .account-card {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.04);
  }

  .account-card.art-mint     { background: #cdf3e3; }
  .account-card.art-lavender { background: #e2e3fb; }
  .account-card.art-peach    { background: #ffe3cc; }

  .account-card-triangle {
    position: absolute;
    top: -10px;
    right: -14px;
    pointer-events: none;
  }
  .account-card.art-mint .account-card-triangle     { color: #34d399; opacity: 0.4; }
  .account-card.art-lavender .account-card-triangle { color: #818cf8; opacity: 0.4; }
  .account-card.art-peach .account-card-triangle    { color: #fb923c; opacity: 0.4; }

  .account-card-circle {
    position: absolute;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    bottom: -45px;
    left: -35px;
    pointer-events: none;
  }
  .account-card.art-mint .account-card-circle     { background: #ffd9b3; opacity: 0.85; }
  .account-card.art-lavender .account-card-circle { background: #fbcfe8; opacity: 0.85; }
  .account-card.art-peach .account-card-circle    { background: #99f6e4; opacity: 0.85; }

  .account-card:hover {
    transform: translateY(-4px);
  }

  .account-card.art-mint:hover     { box-shadow: 0 14px 28px rgba(16, 185, 129, 0.28); }
  .account-card.art-lavender:hover { box-shadow: 0 14px 28px rgba(99, 102, 241, 0.28); }
  .account-card.art-peach:hover    { box-shadow: 0 14px 28px rgba(251, 146, 60, 0.32); }

  .account-card-body {
    position: relative;
    z-index: 1;
    padding: 16px 18px 18px;
  }

  .account-chip-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(255,255,255,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
  }

  .account-name {
    font-weight: 700;
    font-size: 0.95rem;
  }

  .account-card.art-mint .account-name     { color: #064e3b; }
  .account-card.art-lavender .account-name { color: #312e81; }
  .account-card.art-peach .account-name    { color: #7c2d12; }

  .account-balance-display {
    display: flex;
    align-items: baseline;
    gap: 3px;
    margin: 10px 0 10px;
  }

  .account-card.art-mint .account-currency,
  .account-card.art-mint .account-amount { color: #065f46; }
  .account-card.art-lavender .account-currency,
  .account-card.art-lavender .account-amount { color: #3730a3; }
  .account-card.art-peach .account-currency,
  .account-card.art-peach .account-amount { color: #9a3412; }

  .account-currency {
    font-size: 1rem;
    font-weight: 600;
  }

  .account-amount {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.3px;
  }

  .account-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .account-type-badge {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 3px 9px;
    border-radius: 5px;
    color: #fff;
  }

  .account-card.art-mint .account-type-badge     { background: #10b981; }
  .account-card.art-lavender .account-type-badge { background: #6366f1; }
  .account-card.art-peach .account-type-badge    { background: #fb923c; }

  .account-pct {
    font-size: 0.7rem;
    font-weight: 600;
  }
  .account-card.art-mint .account-pct     { color: #047857; }
  .account-card.art-lavender .account-pct { color: #4338ca; }
  .account-card.art-peach .account-pct    { color: #c2410c; }

  .account-bar-bg {
    height: 5px;
    border-radius: 3px;
    overflow: hidden;
  }
  .account-card.art-mint .account-bar-bg     { background: rgba(6, 95, 70, 0.14); }
  .account-card.art-lavender .account-bar-bg { background: rgba(55, 48, 163, 0.14); }
  .account-card.art-peach .account-bar-bg    { background: rgba(154, 52, 18, 0.14); }

  .account-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .account-card.art-mint .account-bar-fill     { background: #10b981; }
  .account-card.art-lavender .account-bar-fill { background: #6366f1; }
  .account-card.art-peach .account-bar-fill    { background: #fb923c; }

  /* ── Credit/Debit Cards: flat duotone art tiles ── */
  .card-item {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    padding: 18px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
    color: #fff;
  }

  .card-item.art-aurora {
    background: linear-gradient(135deg, #1b1730 0%, #1b1730 55%, #4c1d95 55%, #4c1d95 100%);
  }

  .card-item.art-sunset {
    background: linear-gradient(135deg, #2b1320 0%, #2b1320 55%, #9a3412 55%, #9a3412 100%);
  }

  .card-item.art-ocean {
    background: linear-gradient(135deg, #0b2236 0%, #0b2236 55%, #0e7490 55%, #0e7490 100%);
  }

  .card-item svg.card-item-triangle { color: rgba(255,255,255,0.22); }
  .card-item svg:not(.card-item-triangle) { color: #fbbf24; }

  .card-item-triangle {
    position: absolute;
    top: -8px;
    right: -16px;
    pointer-events: none;
  }

  .card-item-blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }
  .card-item-blob.b1 { width: 100px; height: 100px; top: -35px; right: 36px; }
  .card-item-blob.b2 { width: 130px; height: 130px; bottom: -55px; left: -40px; }
  .card-item-blob.b3 { width: 46px; height: 46px; bottom: 30px; right: -16px; }

  .card-item.art-aurora .card-item-blob.b1 { background: #7c3aed; opacity: 0.55; }
  .card-item.art-aurora .card-item-blob.b2 { background: #ec4899; opacity: 0.3; }
  .card-item.art-aurora .card-item-blob.b3 { background: #22d3ee; opacity: 0.35; }

  .card-item.art-sunset .card-item-blob.b1 { background: #f97316; opacity: 0.5; }
  .card-item.art-sunset .card-item-blob.b2 { background: #fb7185; opacity: 0.3; }
  .card-item.art-sunset .card-item-blob.b3 { background: #fbbf24; opacity: 0.4; }

  .card-item.art-ocean .card-item-blob.b1 { background: #22d3ee; opacity: 0.4; }
  .card-item.art-ocean .card-item-blob.b2 { background: #3b82f6; opacity: 0.3; }
  .card-item.art-ocean .card-item-blob.b3 { background: #14b8a6; opacity: 0.45; }

  .card-item:hover {
    transform: translateY(-4px);
  }

  .card-item.art-aurora:hover { box-shadow: 0 14px 28px rgba(124, 58, 237, 0.4); }
  .card-item.art-sunset:hover { box-shadow: 0 14px 28px rgba(249, 115, 22, 0.4); }
  .card-item.art-ocean:hover  { box-shadow: 0 14px 28px rgba(14, 165, 233, 0.4); }

  .card-number {
    position: relative;
    z-index: 1;
    font-family: 'Courier New', monospace;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.9);
    margin-bottom: 10px;
  }

  .card-name {
    position: relative;
    z-index: 1;
    font-weight: 700;
    color: #fff;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 12px;
  }

  .card-balance {
    font-size: 1.05rem;
    font-weight: 800;
    color: #fff;
  }

  .card-balance-row {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .balance-label {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.65);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .card-balance.used { font-size: 1.05rem; font-weight: 800; color: #fde047; }
  .card-limit { font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.85); }

  .credit-bar {
    position: relative;
    z-index: 1;
    height: 6px;
    background: rgba(255,255,255,0.22);
    border-radius: 3px;
    overflow: hidden;
    margin: 8px 0 4px;
  }
  .credit-fill {
    height: 100%;
    background: #fbbf24;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .card-bottom-row {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.18);
  }

  .card-type {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: rgba(255,255,255,0.85);
  }

  .card-expiry {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.4px;
    color: rgba(255,255,255,0.7);
  }

  .card-due {
    position: relative;
    z-index: 1;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.65);
    margin-top: 6px;
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