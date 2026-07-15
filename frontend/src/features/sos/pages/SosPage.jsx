import { useState } from 'react';
import { sosApi } from '../api/sos.api';

// Deliberately the simplest page in the app: one giant button, one
// confirmation, no navigation to think about. An emergency UI should
// never make someone hunt for the right screen.
export default function SosPage() {
  const [state, setState] = useState('idle'); // idle | confirming | sending | sent | error

  const handleTrigger = async () => {
    setState('sending');
    try {
      await sosApi.trigger();
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      {state === 'sent' ? (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-2xl mb-4">✓</div>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Alert sent</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your society's admin and watchman have been notified.</p>
        </>
      ) : state === 'confirming' ? (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            This will immediately alert your society's admin and watchman. Only use this in a real emergency.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setState('idle')} className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800">
              Cancel
            </button>
            <button onClick={handleTrigger} className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white font-medium">
              Confirm emergency
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => setState('confirming')}
            disabled={state === 'sending'}
            className="w-40 h-40 rounded-full bg-red-600 text-white text-xl font-bold shadow-lg active:scale-95 transition disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : 'SOS'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Tap for emergencies only</p>
          {state === 'error' && <p className="text-sm text-red-600 mt-2">Couldn't send the alert. Please try again or call your watchman directly.</p>}
        </>
      )}
    </div>
  );
}
