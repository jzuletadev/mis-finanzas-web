import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const ButtonMenu = ({ onNewIncome, onNewExpense, onNewAccount, onNewCard, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <StyledWrapper ref={menuRef}>
      <button className="btn" onClick={() => setIsOpen(!isOpen)}>
        <span className="icon">
          <svg viewBox="0 0 175 80" width={40} height={40}>
            <rect width={80} height={15} fill="#f0f0f0" rx={10} />
            <rect y={30} width={80} height={15} fill="#f0f0f0" rx={10} />
            <rect y={60} width={80} height={15} fill="#f0f0f0" rx={10} />
          </svg>
        </span>
        <span className="text">MENU</span>
      </button>

      {isOpen && (
        <div className="dropdown">
          <button className="dropdown-item income" onClick={() => handleAction(onNewIncome)}>
            <span className="item-icon">+</span>
            Nuevo Ingreso
          </button>
          <button className="dropdown-item expense" onClick={() => handleAction(onNewExpense)}>
            <span className="item-icon">-</span>
            Nuevo Gasto
          </button>
          <div className="dropdown-divider" />
          <button className="dropdown-item account" onClick={() => handleAction(onNewAccount)}>
            <span className="item-icon">🏦</span>
            Nueva Cuenta
          </button>
          <button className="dropdown-item card" onClick={() => handleAction(onNewCard)}>
            <span className="item-icon">💳</span>
            Nueva Tarjeta
          </button>
          <div className="dropdown-divider" />
          <button className="dropdown-item logout" onClick={() => handleAction(onLogout)}>
            <span className="item-icon">⏻</span>
            Cerrar Sesión
          </button>
        </div>
      )}
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: relative;

  .btn {
    width: 150px;
    height: 50px;
    border-radius: 5px;
    border: none;
    transition: all 0.5s ease-in-out;
    font-size: 20px;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-weight: 600;
    display: flex;
    align-items: center;
    background: #040f16;
    color: #f5f5f5;
    cursor: pointer;
  }

  .btn:hover {
    box-shadow: 0 0 20px 0px #2e2e2e3a;
  }

  .btn .icon {
    position: absolute;
    height: 40px;
    width: 70px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.5s;
  }

  .btn .text {
    transform: translateX(55px);
  }

  .btn:hover .icon {
    width: 175px;
  }

  .btn:hover .text {
    transition: all 0.5s;
    opacity: 0;
  }

  .btn:focus {
    outline: none;
  }

  .btn:active .icon {
    transform: scale(0.85);
  }

  .dropdown {
    position: absolute;
    top: 58px;
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    min-width: 220px;
    z-index: 1000;
    overflow: hidden;
    animation: slideDown 0.2s ease;
    border: 1px solid #e2e8f0;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dropdown-item {
    width: 100%;
    padding: 14px 20px;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.95rem;
    font-weight: 500;
    color: #374151;
    transition: all 0.15s;
    font-family: inherit;
  }

  .dropdown-item:hover {
    background: #f9fafb;
  }

  .dropdown-item.income:hover {
    background: #f0fdf4;
    color: #166534;
  }

  .dropdown-item.expense:hover {
    background: #fef2f2;
    color: #991b1b;
  }

  .dropdown-item.logout:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  .dropdown-item.account:hover {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .dropdown-item.card:hover {
    background: #f5f3ff;
    color: #5b21b6;
  }

  .account .item-icon {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .card .item-icon {
    background: #ede9fe;
    color: #5b21b6;
  }

  .item-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
  }

  .income .item-icon {
    background: #dcfce7;
    color: #166534;
  }

  .expense .item-icon {
    background: #fee2e2;
    color: #991b1b;
  }

  .logout .item-icon {
    background: #f3f4f6;
    color: #6b7280;
  }

  .dropdown-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 4px 0;
  }`;

export default ButtonMenu;
