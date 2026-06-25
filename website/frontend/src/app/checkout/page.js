'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Checkout() {
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedPlan');
    if (stored) {
      setPlan(JSON.parse(stored));
    } else {
      router.push('/pricing');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In production, point this to your NestJS backend URL
      const response = await fetch('http://localhost:3001/api/paymob/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.amount,
          planType: plan.planType,
          clientData: formData,
        }),
      });

      const data = await response.json();
      if (data.iframeUrl) {
        sessionStorage.setItem('clientData', JSON.stringify(formData));
        // Redirect to Paymob iframe
        window.location.href = data.iframeUrl;
      } else {
        alert('حدث خطأ أثناء معالجة الدفع');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <main className="container animate-fade-in" style={{ padding: '80px 20px', maxWidth: '600px' }}>
      <div className="glass" style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '10px', textAlign: 'center' }}>إتمام الدفع</h1>
        <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '30px' }}>
          الباقة المختارة: {plan.planType === 'monthly' ? 'شهرية' : 'سنوية'} (${plan.amount})
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <input
              type="text"
              placeholder="الاسم الأول"
              required
              style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <input
              type="text"
              placeholder="الاسم الأخير"
              required
              style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            required
            style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            type="tel"
            placeholder="رقم الهاتف"
            required
            style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '20px', padding: '15px' }}>
            {loading ? 'جاري التحويل...' : 'المتابعة للدفع'}
          </button>
        </form>
      </div>
    </main>
  );
}
