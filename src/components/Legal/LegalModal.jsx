import React, { useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgba(6, 16, 30, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const ModalContainer = styled(motion.div)`
  background: #ffffff;
  width: 100%;
  max-width: 580px;
  max-height: 85vh;
  max-height: 85dvh;
  border-radius: 24px;
  border: 3px solid #059669;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  position: relative;

  [data-theme="dark"] & {
    background: #111827;
    border-color: #059669;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }

  @media (max-width: 480px) {
    max-height: 90vh;
    max-height: 90dvh;
    border-radius: 20px;
    border-width: 2.5px;
  }
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #ffffff;

  [data-theme="dark"] & {
    background: #111827;
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 480px) {
    padding: 16px 20px;
  }
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-family: 'Fredoka', 'Nunito', sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  color: #0b3954;
  letter-spacing: 0.02em;

  [data-theme="dark"] & {
    color: #f1f5f9;
  }

  @media (max-width: 480px) {
    font-size: 1.15rem;
  }
`;

const CloseIconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    background: #e2e8f0;
    color: #0f172a;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  [data-theme="dark"] & {
    background: #1f2937;
    color: #94a3b8;

    &:hover {
      background: #374151;
      color: #f8fafc;
    }
  }
`;

const ModalContent = styled.div`
  padding: 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  font-family: 'Nunito', sans-serif;
  font-size: 0.95rem;
  line-height: 1.65;
  color: #334155;
  white-space: pre-wrap;
  background: #f8fafc;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 10px;
  }

  [data-theme="dark"] & {
    background: #0f172a;
    color: #cbd5e1;

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  @media (max-width: 480px) {
    padding: 16px 18px;
    font-size: 0.9rem;
    line-height: 1.6;
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;

  [data-theme="dark"] & {
    background: #111827;
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 480px) {
    padding: 14px 18px;
  }
`;

const CloseButton = styled.button`
  background-color: #059669;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 12px 36px;
  font-family: 'Nunito', sans-serif;
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.5px;
  cursor: pointer;
  box-shadow: #047857 0 5px 0 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  text-transform: uppercase;

  &:hover {
    transform: translateY(2px);
    box-shadow: #047857 0 3px 0 0;
  }

  &:active {
    transform: translateY(5px);
    box-shadow: #047857 0 0px 0 0;
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 13px 0;
  }
`;

const LegalModal = ({ isOpen, onClose, title, content }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <ModalContainer
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
          >
            <ModalHeader>
              <ModalTitle id="legal-modal-title">{title}</ModalTitle>
              <CloseIconButton onClick={onClose} aria-label="Close dialog" type="button">
                <IoClose size={20} />
              </CloseIconButton>
            </ModalHeader>
            <ModalContent tabIndex={0}>
              {content}
            </ModalContent>
            <ModalFooter>
              <CloseButton type="button" onClick={onClose}>
                Close
              </CloseButton>
            </ModalFooter>
          </ModalContainer>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default LegalModal;
