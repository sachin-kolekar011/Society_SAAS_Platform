// import { useEffect, useState } from 'react';
// import { billingApi } from '../api/billing.api';
// import { useAuth } from '../../../contexts/AuthContext';
// import { ROLES } from '../../../constants/roles';
// import Skeleton from '../../../components/ui/Skeleton';
// import EmptyState from '../../../components/ui/EmptyState';
// import Button from '../../../components/ui/Button';

// const STATUS_STYLES = {
//   PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
//   PAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
//   OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
// };

// function loadRazorpayScript() {
//   return new Promise((resolve) => {
//     if (window.Razorpay) return resolve(true);
//     const script = document.createElement('script');
//     script.src = 'https://checkout.razorpay.com/v1/checkout.js';
//     script.onload = () => resolve(true);
//     script.onerror = () => resolve(false);
//     document.body.appendChild(script);
//   });
// }

// export default function BillingPage() {
//   const { user, tenant } = useAuth();
//   const isAdmin = user?.role === ROLES.ADMIN;

//   const [bills, setBills] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [payingBillId, setPayingBillId] = useState(null);

//   const fetchBills = async () => {
//     const res = await billingApi.list({});
//     setBills(res.data.data);
//     setIsLoading(false);
//   };

//   useEffect(() => { fetchBills(); }, []);

//   const handlePay = async (bill) => {
//     setPayingBillId(bill.id);
//     const scriptLoaded = await loadRazorpayScript();
//     if (!scriptLoaded) {
//       alert('Could not load the payment gateway. Please check your connection.');
//       setPayingBillId(null);
//       return;
//     }

//     const order = await billingApi.createOrder(bill.id);
//     const { paymentId, razorpayOrderId, amount, keyId } = order.data.data;

//     // Razorpay's checkout widget handles the actual card/UPI entry -- we
//     // never touch card details ourselves, which is both simpler and the
//     // only sane way to handle payment data without a PCI-DSS burden.
//     const razorpay = new window.Razorpay({
//       key: keyId,
//       amount,
//       currency: 'INR',
//       name: tenant?.name || 'Society SaaS',
//       description: `Maintenance - ${bill.billingPeriod}`,
//       order_id: razorpayOrderId,
//       handler: async (response) => {
//         await billingApi.verify({
//           paymentId,
//           razorpayOrderId: response.razorpay_order_id,
//           razorpayPaymentId: response.razorpay_payment_id,
//           razorpaySignature: response.razorpay_signature,
//         });
//         fetchBills();
//       },
//       modal: { ondismiss: () => setPayingBillId(null) },
//     });
//     razorpay.open();
//   };

//   if (isLoading) return <Skeleton rows={3} />;

//   return (
//     <div className="max-w-2xl">
//       <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
//         {isAdmin ? 'Maintenance bills' : 'Your maintenance bills'}
//       </h1>

//       {bills.length === 0 ? (
//         <EmptyState title="No bills yet" description={isAdmin ? 'Generate this month\'s bills to get started.' : 'Nothing due right now.'} />
//       ) : (
//         <ul className="space-y-2">
//           {bills.map((bill) => (
//             <li key={bill.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-900 dark:text-gray-100">{bill.billingPeriod} · ₹{((bill.amount + bill.penaltyAmount) / 100).toFixed(2)}</p>
//                 <p className="text-xs text-gray-500 dark:text-gray-400">Due {new Date(bill.dueDate).toLocaleDateString()}</p>
//               </div>
//               <div className="flex items-center gap-2">
//                 <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_STYLES[bill.status]}`}>{bill.status}</span>
//                 {!isAdmin && bill.status !== 'PAID' && (
//                   <Button onClick={() => handlePay(bill)} isLoading={payingBillId === bill.id} className="text-xs px-3 py-1">
//                     Pay now
//                   </Button>
//                 )}
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }




import { useEffect, useState } from 'react';
import { billingApi } from '../api/billing.api';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../constants/roles';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';

const STATUS_STYLES = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingPage() {
  const { user, tenant } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingBillId, setPayingBillId] = useState(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    billingPeriod: new Date().toISOString().slice(0, 7), // "2026-07" -- current month, matching MaintenanceBill.billingPeriod's format (Phase 4)
    amount: '',
    dueDate: '',
  });
  const [generateError, setGenerateError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchBills = async () => {
    const res = await billingApi.list({});
    setBills(res.data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchBills(); }, []);

  const handlePay = async (bill) => {
    setPayingBillId(bill.id);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert('Could not load the payment gateway. Please check your connection.');
      setPayingBillId(null);
      return;
    }

    const order = await billingApi.createOrder(bill.id);
    const { paymentId, razorpayOrderId, amount, keyId } = order.data.data;

    // Razorpay's checkout widget handles the actual card/UPI entry -- we
    // never touch card details ourselves, which is both simpler and the
    // only sane way to handle payment data without a PCI-DSS burden.
    const razorpay = new window.Razorpay({
      key: keyId,
      amount,
      currency: 'INR',
      name: tenant?.name || 'Society SaaS',
      description: `Maintenance - ${bill.billingPeriod}`,
      order_id: razorpayOrderId,
      handler: async (response) => {
        await billingApi.verify({
          paymentId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        fetchBills();
      },
      modal: { ondismiss: () => setPayingBillId(null) },
    });
    razorpay.open();
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerateError(null);
    // amount is stored in paise (Phase 4's currency-handling decision --
    // never floats for money), so the rupee amount typed in the form is
    // converted here, once, at the boundary.
    const amountInRupees = Number(generateForm.amount);
    if (!amountInRupees || amountInRupees <= 0) {
      setGenerateError('Enter a valid amount');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await billingApi.generate({
        billingPeriod: generateForm.billingPeriod,
        amount: Math.round(amountInRupees * 100),
        dueDate: new Date(generateForm.dueDate).toISOString(),
      });
      setShowGenerateForm(false);
      fetchBills();
      alert(`Generated ${result.data.data.billsCreated} bill(s) for ${result.data.data.flatsCount} flat(s). (Flats that already had a bill for this period were skipped.)`);
    } catch (err) {
      setGenerateError(err.response?.data?.error?.message || 'Could not generate bills.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <Skeleton rows={3} />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {isAdmin ? 'Maintenance bills' : 'Your maintenance bills'}
        </h1>
        {isAdmin && (
          <Button onClick={() => setShowGenerateForm(!showGenerateForm)}>
            {showGenerateForm ? 'Cancel' : 'Generate bills'}
          </Button>
        )}
      </div>

      {showGenerateForm && (
        <form onSubmit={handleGenerate} className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Creates one bill for every flat in this society for the given period. Flats that already have a bill for that period are skipped automatically — safe to run more than once.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Period</label>
              <input
                type="month" required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
                value={generateForm.billingPeriod}
                onChange={(e) => setGenerateForm({ ...generateForm, billingPeriod: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Amount (₹)</label>
              <input
                type="number" min="1" required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
                value={generateForm.amount}
                onChange={(e) => setGenerateForm({ ...generateForm, amount: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Due date</label>
              <input
                type="date" required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
                value={generateForm.dueDate}
                onChange={(e) => setGenerateForm({ ...generateForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          {generateError && <p className="text-sm text-red-600 mb-3">{generateError}</p>}
          <Button type="submit" isLoading={isGenerating}>Generate</Button>
        </form>
      )}

      {bills.length === 0 ? (
        <EmptyState title="No bills yet" description={isAdmin ? 'Generate this month\'s bills to get started.' : 'Nothing due right now.'} />
      ) : (
        <ul className="space-y-2">
          {bills.map((bill) => (
            <li key={bill.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">{bill.billingPeriod} · ₹{((bill.amount + bill.penaltyAmount) / 100).toFixed(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Due {new Date(bill.dueDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_STYLES[bill.status]}`}>{bill.status}</span>
                {!isAdmin && bill.status !== 'PAID' && (
                  <Button onClick={() => handlePay(bill)} isLoading={payingBillId === bill.id} className="text-xs px-3 py-1">
                    Pay now
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}