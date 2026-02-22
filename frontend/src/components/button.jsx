import React from 'react'
import styled from 'styled-components'

const Button = ({ type = 'button', label, color, onClick, disabled = false, form }) => {
  return (
    <StyledWrapper color={color} disabled={disabled}>
      <button type={type} onClick={onClick} disabled={disabled} form={form}>
        {label}
      </button>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  button {
    padding: 10px 20px;
    border: unset;
    border-radius: 15px;
    color: #212121;
    z-index: 1;
    background: #e8e8e8;
    position: relative;
    font-weight: 1000;
    font-size: 17px;
    -webkit-box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    transition: all 250ms;
    overflow: hidden;
    cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
    opacity: ${({ disabled }) => disabled ? 0.6 : 1};
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0;
    border-radius: 15px;
    background-color: ${({ color }) => color || '#212121'};
    z-index: -1;
    -webkit-box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    transition: all 250ms;
  }

  button:hover:not(:disabled) {
    color: #e8e8e8;
    transform: scale(1.1);
  }

  button:hover:not(:disabled)::before {
    width: 100%;
  }

  /* Responsive adjustments */
  @media (max-width: 800px) {
    button {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 12px;
      -webkit-box-shadow: 2px 4px 12px -2px rgba(0, 0, 0, 0.27);
      box-shadow: 2px 4px 12px -2px rgba(0, 0, 0, 0.27);
    }

    button::before {
      border-radius: 12px;
    }

    button:hover:not(:disabled) {
      transform: scale(1.05);
    }
  }

  @media (max-width: 480px) {
    button {
      padding: 4px 8px;
      font-size: 10px;
      border-radius: 10px;
      font-weight: 800;
      -webkit-box-shadow: 1px 3px 8px -1px rgba(0, 0, 0, 0.27);
      box-shadow: 1px 3px 8px -1px rgba(0, 0, 0, 0.27);
    }

    button::before {
      border-radius: 10px;
    }

    button:hover:not(:disabled) {
      transform: scale(1.03);
    }
  }
`

export default Button