import { useState } from 'react';

export interface ToastConfig {
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

export const useToast = () => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('#28a745');

    const showToastMessage = (config: ToastConfig | string) => {
        if (typeof config === 'string') {
            setToastMessage(config);
            setToastBg('#28a745'); // default success
        } else {
            setToastMessage(config.message);

            // Set background color based on variant
            switch (config.variant) {
                case 'error':
                    setToastBg('#dc3545');
                    break;
                case 'warning':
                    setToastBg('#ffc107');
                    break;
                case 'info':
                    setToastBg('#17a2b8');
                    break;
                case 'success':
                default:
                    setToastBg('#28a745');
                    break;
            }
        }

        setShowToast(true);
    };

    const hideToast = () => {
        setShowToast(false);
    };

    const toastProps = {
        show: showToast,
        onClose: hideToast,
        delay: 3000,
        autohide: true,
        style: {
            position: 'fixed' as const,
            top: 20,
            left: 20,
            background: toastBg,
            color: 'white',
            zIndex: 9999,
        },
    };

    return {
        showToast: showToastMessage,
        hideToast,
        toastProps,
        toastMessage,
    };
};