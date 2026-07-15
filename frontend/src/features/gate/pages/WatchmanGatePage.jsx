import { useState } from 'react';
import { gateApi } from '../api/gate.api';
import Button from '../../../components/ui/Button';

// Manual token entry, not a live camera scanner -- a real scanner needs a
// getUserMedia + barcode-detection library (e.g. html5-qrcode), which is a
// reasonable next addition but adds a dependency and camera-permission UX
// this pass doesn't need to ship. Practically: the watchman opens the
// visitor's QR image (shown on the resident's phone) and either types the
// short code below it or a phone camera app's built-in QR reader fills
// this field via a deep link -- both paths land here as plain text.
export default function WatchmanGatePage() {
  const [token, setToken] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action) => {
    if (!token.trim()) return;
    setIsLoading(true);
    setLastResult(null);
    try {
      const res = action === 'in' ? await gateApi.checkIn(token.trim()) : await gateApi.checkOut(token.trim());
      setLastResult({ success: true, pass: res.data.data });
      setToken('');
    } catch (err) {
      setLastResult({ success: false, message: err.response?.data?.error?.message || 'Something went wrong' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-sm">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Gate check-in / check-out</h1>

      <input
        autoFocus
        placeholder="Scan or paste visitor code"
        className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-3 mb-3 bg-white dark:bg-gray-900"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />

      <div className="flex gap-2 mb-4">
        <Button onClick={() => handleAction('in')} isLoading={isLoading} className="flex-1">Check in</Button>
        <Button onClick={() => handleAction('out')} isLoading={isLoading} variant="secondary" className="flex-1">Check out</Button>
      </div>

      {lastResult && (
        <div className={`p-3 rounded-lg text-sm ${lastResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/30' : 'bg-red-50 text-red-700 dark:bg-red-900/30'}`}>
          {lastResult.success
            ? `${lastResult.pass.visitorName} — ${lastResult.pass.status.replace('_', ' ').toLowerCase()}`
            : lastResult.message}
        </div>
      )}
    </div>
  );
}
