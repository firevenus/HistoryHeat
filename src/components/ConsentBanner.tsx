import { useContext } from 'react';
import { LocaleContext } from '../contexts/LocaleContext';

export const ConsentBanner = ({ onAccept, onReject }) => {
  const { t } = useContext(LocaleContext);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0 md:mr-6">
          <h3 className="text-lg font-medium dark:text-gray-100">{t('consentBanner.title')}</h3>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{t('consentBanner.description')}</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('consentBanner.accept')}
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('consentBanner.reject')}
          </button>
        </div>
      </div>
    </div>
  );
};