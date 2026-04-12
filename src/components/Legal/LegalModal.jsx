import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

const ModalContainer = styled(motion.div)`
  background: #ffffff;
  width: 100%;
  max-width: 550px;
  max-height: 85vh;
  border-radius: 24px;
  border: 2px solid #f18f01;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  text-align: center;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #0b3954;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ModalContent = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #444;
  white-space: pre-wrap;
  background: #fafafa;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px 24px;
  display: flex;
  justify-content: center;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`;

const CloseButton = styled.button`
  background-color: #f18f01;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 40px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: #cd8b76 0 6px 0 0;
  transition: all 0.1s ease;
  text-transform: uppercase;

  &:hover {
    transform: translateY(1px);
    box-shadow: #cd8b76 0 5px 0 0;
  }

  &:active {
    transform: translateY(6px);
    box-shadow: #cd8b76 0 0px 0 0;
    transition: 100ms;
  }
`;

const LegalModal = ({ isOpen, onClose, title, content }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContainer
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>{title}</ModalTitle>
            </ModalHeader>
            <ModalContent>
              {content}
            </ModalContent>
            <ModalFooter>
              <CloseButton onClick={onClose}>
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
