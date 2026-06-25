'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Success() {
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const clientDataStr = sessionStorage.getItem('clientData');
        const planStr = sessionStorage.getItem('selectedPlan');
        
        if (clientDataStr && planStr) {
          const clientData = JSON.parse(clientDataStr);
          const plan = JSON.parse(planStr);

          const res = await fetch('http://localhost:3001/api/paymob/verify-success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientData,
              planType: plan.planType,
              amount: plan.amount
            })
          });

          const data = await res.json();
          if (data.success && data.client) {
            setClient(data.client);
          }
        }
      } catch (err) {
        console.error('Error verifying success:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, []);

  return (
    <main className="container animate-fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div className="glass" style={{ padding: '50px', maxWidth: '750px', margin: '0 auto' }}>
        <div style={{ fontSize: '4.5rem', marginBottom: '15px' }}>🎉</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '15px', color: '#4ade80' }}>تم الدفع وتفعيل حسابك بنجاح!</h1>
        <p style={{ fontSize: '1.1rem', color: '#aaa', marginBottom: '30px', lineHeight: '1.6' }}>
          شكراً لاشتراكك في Whatsi. تم إنشاء الترخيص الخاص بك وهو جاهز للاستخدام الآن.
        </p>

        {loading ? (
          <div style={{ padding: '30px', color: '#ccc' }}>جاري تجهيز كود التفعيل الخاص بك...</div>
        ) : (
          <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px dashed #4ade80', padding: '25px', borderRadius: '15px', marginBottom: '35px' }}>
            <h3 style={{ color: '#4ade80', marginBottom: '12px', fontSize: '1.2rem' }}>🔑 كود التفعيل الخاص بك (Activation Code):</h3>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', margin: '15px 0', flexWrap: 'wrap' }}>
              <code style={{ background: '#0a0a0a', border: '1px solid #222', padding: '12px 25px', borderRadius: '10px', fontSize: '1.6rem', fontWeight: 'bold', letterSpacing: '3px', color: '#fff', userSelect: 'all' }}>
                {client?.activationCode || 'WHTSI-DEMO1234'}
              </code>
              
              <button 
                onClick={() => { 
                  navigator.clipboard.writeText(client?.activationCode || 'WHTSI-DEMO1234'); 
                  alert('تم نسخ كود التفعيل!'); 
                }}
                className="btn-primary"
                style={{ padding: '12px 25px', fontSize: '1rem', cursor: 'pointer' }}
              >
                📋 نسخ الكود
              </button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '10px' }}>
              نوع الاشتراك: <strong style={{ color: '#fff' }}>{client?.planType === 'yearly' ? 'سنوي' : 'شهري'}</strong> | صالح حتى: <strong style={{ color: '#fff' }}>{client?.expiryDate || 'N/A'}</strong>
            </p>
          </div>
        )}
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '30px', borderRadius: '15px', marginBottom: '35px', border: '1px solid var(--card-border)' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '1.3rem', color: '#fff' }}>⬇️ تحميل وتثبيت التطبيق</h3>
          <p style={{ marginBottom: '20px', color: '#bbb', fontSize: '0.95rem' }}>قم بتحميل برنامج Whatsi على جهازك وانسخ كود التفعيل في خانة التسجيل لبدء الإرسال فوراً!</p>
          <a 
            href="/whatsi-setup.exe" 
            download="whatsi-setup.exe" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary" 
            style={{ display: 'inline-block', padding: '15px 45px', fontSize: '1.1rem', fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer' }}
          >
            ⬇️ تحميل برنامج Whatsi للكمبيوتر
          </a>
        </div>

        <button className="glass" onClick={() => router.push('/')} style={{ padding: '12px 30px', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '10px' }}>
          العودة للرئيسية
        </button>
      </div>
    </main>
  );
}
