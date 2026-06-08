import React from 'react';
import ReactDOM from 'react-dom';

interface PrintPortalProps {
  children: React.ReactNode;
}

export const PrintPortal: React.FC<PrintPortalProps> = ({ children }) => {
  const printRoot = document.getElementById('print-root');
  if (!printRoot) return null;
  return ReactDOM.createPortal(children, printRoot);
};
