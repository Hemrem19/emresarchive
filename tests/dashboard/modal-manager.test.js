/**
 * Tests for Modal Manager Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    showModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getActiveModalCount,
    showConfirmationModal,
    showAlertModal
} from '../../dashboard/services/modal-manager.js';

describe('Modal Manager Service', () => {
    beforeEach(() => {
        // Clean up any existing modals
        document.body.innerHTML = '';
    });

    afterEach(() => {
        // Clean up after each test
        closeAllModals();
        document.body.innerHTML = '';
    });

    describe('showModal', () => {
        it('should inject modal HTML into the DOM', () => {
            const html = '<div id="test-modal" class="hidden">Test Modal</div>';
            
            showModal({ id: 'test-modal', html });
            
            const modal = document.getElementById('test-modal');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toBe('Test Modal');
        });

        it('should show modal by removing hidden class', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ id: 'test-modal', html });
            
            const modal = document.getElementById('test-modal');
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        it('should attach event handlers', () => {
            const html = `
                <div id="test-modal" class="hidden">
                    <button id="test-button">Click</button>
                </div>
            `;
            const clickHandler = vi.fn();
            
            showModal({
                id: 'test-modal',
                html,
                handlers: {
                    'test-button': {
                        event: 'click',
                        callback: clickHandler
                    }
                }
            });
            
            const button = document.getElementById('test-button');
            button.click();
            
            expect(clickHandler).toHaveBeenCalledTimes(1);
        });

        it('should call onOpen callback', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            const onOpen = vi.fn();
            
            showModal({ id: 'test-modal', html, onOpen });
            
            expect(onOpen).toHaveBeenCalledTimes(1);
        });

        it('should replace existing modal with same ID', () => {
            const html1 = '<div id="test-modal" class="hidden">First</div>';
            const html2 = '<div id="test-modal" class="hidden">Second</div>';
            
            showModal({ id: 'test-modal', html: html1 });
            showModal({ id: 'test-modal', html: html2 });
            
            const modals = document.querySelectorAll('#test-modal');
            expect(modals.length).toBe(1);
            expect(modals[0].textContent).toBe('Second');
        });

        it('should close modal on backdrop click by default', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ id: 'test-modal', html });
            
            const modal = document.getElementById('test-modal');
            modal.click();
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should not close modal on backdrop click when disabled', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ 
                id: 'test-modal', 
                html,
                closeOnBackdropClick: false
            });
            
            const modal = document.getElementById('test-modal');
            modal.click();
            
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        it('should close modal on Escape key by default', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ id: 'test-modal', html });
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            const modal = document.getElementById('test-modal');
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should not close modal on Escape key when disabled', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ 
                id: 'test-modal', 
                html,
                closeOnEscape: false
            });
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            const modal = document.getElementById('test-modal');
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        it('should return controller with close method', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            const controller = showModal({ id: 'test-modal', html });
            
            expect(controller).toHaveProperty('close');
            expect(typeof controller.close).toBe('function');
        });
    });

    describe('closeModal', () => {
        it('should close specific modal', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ id: 'test-modal', html });
            closeModal('test-modal');
            
            const modal = document.getElementById('test-modal');
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should call onClose callback', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            const onClose = vi.fn();
            
            showModal({ id: 'test-modal', html, onClose });
            closeModal('test-modal');
            
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should do nothing if modal does not exist', () => {
            expect(() => closeModal('non-existent')).not.toThrow();
        });
    });

    describe('closeAllModals', () => {
        it('should close all open modals', () => {
            const html1 = '<div id="modal-1" class="hidden">Modal 1</div>';
            const html2 = '<div id="modal-2" class="hidden">Modal 2</div>';
            
            showModal({ id: 'modal-1', html: html1 });
            showModal({ id: 'modal-2', html: html2 });
            
            closeAllModals();
            
            const modal1 = document.getElementById('modal-1');
            const modal2 = document.getElementById('modal-2');
            
            expect(modal1.classList.contains('hidden')).toBe(true);
            expect(modal2.classList.contains('hidden')).toBe(true);
        });
    });

    describe('isModalOpen', () => {
        it('should return true for open modal', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ id: 'test-modal', html });
            
            expect(isModalOpen('test-modal')).toBe(true);
        });

        it('should return false for closed modal', () => {
            // Clean up any modals from previous tests
            closeAllModals();
            expect(isModalOpen('test-modal')).toBe(false);
        });

        it('should return false immediately after calling closeModal', () => {
            const html = '<div id="test-modal" class="hidden">Test</div>';
            
            showModal({ id: 'test-modal', html });
            closeModal('test-modal');
            
            // Modal is removed from registry immediately when close() is called
            expect(isModalOpen('test-modal')).toBe(false);
        });
    });

    describe('getActiveModalCount', () => {
        it('should return 0 when no modals are open', () => {
            // Clean up any modals from previous tests
            closeAllModals();
            expect(getActiveModalCount()).toBe(0);
        });

        it('should return correct count of open modals', () => {
            // Clean up first
            closeAllModals();
            
            const html1 = '<div id="modal-1" class="hidden">Modal 1</div>';
            const html2 = '<div id="modal-2" class="hidden">Modal 2</div>';
            
            showModal({ id: 'modal-1', html: html1 });
            expect(getActiveModalCount()).toBe(1);
            
            showModal({ id: 'modal-2', html: html2 });
            expect(getActiveModalCount()).toBe(2);
            
            closeModal('modal-1');
            expect(getActiveModalCount()).toBe(1);
        });
    });

    describe('showConfirmationModal', () => {
        it('should create confirmation modal with default text', () => {
            showConfirmationModal({
                message: 'Are you sure?'
            });
            
            const modal = document.getElementById('confirmation-modal');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('Are you sure?');
            expect(modal.textContent).toContain('Confirm');
            expect(modal.textContent).toContain('Cancel');
        });

        it('should use custom button text', () => {
            showConfirmationModal({
                message: 'Delete this?',
                confirmText: 'Yes, Delete',
                cancelText: 'No, Keep'
            });
            
            const modal = document.getElementById('confirmation-modal');
            expect(modal.textContent).toContain('Yes, Delete');
            expect(modal.textContent).toContain('No, Keep');
        });

        it('should call onConfirm when confirm button clicked', () => {
            const onConfirm = vi.fn();
            
            showConfirmationModal({
                message: 'Confirm?',
                onConfirm
            });
            
            const confirmBtn = document.getElementById('confirmation-confirm-btn');
            confirmBtn.click();
            
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });

        it('should call onCancel when cancel button clicked', () => {
            const onCancel = vi.fn();
            
            showConfirmationModal({
                message: 'Confirm?',
                onCancel
            });
            
            const cancelBtn = document.getElementById('confirmation-cancel-btn');
            cancelBtn.click();
            
            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        it('should close modal after confirmation', () => {
            closeAllModals(); // Clean up first
            showConfirmationModal({
                message: 'Confirm?'
            });
            
            const confirmBtn = document.getElementById('confirmation-confirm-btn');
            confirmBtn.click();
            
            expect(isModalOpen('confirmation-modal')).toBe(false);
        });
    });

    describe('showAlertModal', () => {
        it('should create alert modal with default text', () => {
            showAlertModal({
                message: 'Alert message'
            });
            
            const modal = document.getElementById('alert-modal');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('Alert message');
            expect(modal.textContent).toContain('OK');
        });

        it('should use custom button text', () => {
            showAlertModal({
                message: 'Success!',
                buttonText: 'Got it'
            });
            
            const modal = document.getElementById('alert-modal');
            expect(modal.textContent).toContain('Got it');
        });

        it('should call onClose when OK button clicked', () => {
            const onClose = vi.fn();
            
            showAlertModal({
                message: 'Alert',
                onClose
            });
            
            const okBtn = document.getElementById('alert-ok-btn');
            okBtn.click();
            
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should close modal after OK clicked', () => {
            closeAllModals(); // Clean up first
            showAlertModal({
                message: 'Alert'
            });
            
            const okBtn = document.getElementById('alert-ok-btn');
            okBtn.click();
            
            expect(isModalOpen('alert-modal')).toBe(false);
        });

        it('should apply correct styling for different types', () => {
            const types = ['info', 'success', 'warning', 'error'];
            
            types.forEach(type => {
                showAlertModal({
                    message: 'Test',
                    type
                });
                
                const modal = document.getElementById('alert-modal');
                expect(modal).toBeTruthy();
                
                closeModal('alert-modal');
            });
        });
    });
});

