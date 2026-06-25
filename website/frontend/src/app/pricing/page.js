'use client';
import { useRouter } from 'next/navigation';

export default function Pricing() {
  const router = useRouter();

  const handleSelect = (planType, amount) => {
    // Store selected plan in session storage to use in checkout
    sessionStorage.setItem('selectedPlan', JSON.stringify({ planType, amount }));
    router.push('/checkout');
  };

  return (
    <main className="container animate-fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>اختر الباقة المناسبة لك</h1>
      <p style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '60px' }}>
        باقات مرنة تناسب جميع احتياجاتك
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* Monthly Plan */}
        <div className="glass" style={{ padding: '40px', width: '350px', textAlign: 'center', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>الباقة الشهرية</h2>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '20px 0', color: 'var(--primary-color)' }}>
            $25 <span style={{ fontSize: '1rem', color: '#aaa' }}>/ شهر</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px', color: '#ccc', lineHeight: '2.5', textAlign: 'right' }}>
            <li>✔️ تفعيل لجهاز واحد</li>
            <li>✔️ إدارة حملات غير محدودة</li>
            <li>✔️ دعم فني على مدار الساعة</li>
            <li>✔️ تحديثات مجانية</li>
          </ul>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => handleSelect('monthly', 25)}>
            اشترك الآن
          </button>
        </div>

        {/* Yearly Plan */}
        <div className="glass" style={{ padding: '40px', width: '350px', textAlign: 'center', border: '2px solid var(--primary-color)', position: 'relative', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ position: 'absolute', top: '-15px', right: '50%', transform: 'translateX(50%)', background: 'var(--primary-gradient)', padding: '5px 15px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
            الأكثر مبيعاً
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>الباقة السنوية</h2>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '20px 0', color: 'var(--primary-color)' }}>
            $200 <span style={{ fontSize: '1rem', color: '#aaa' }}>/ سنة</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px', color: '#ccc', lineHeight: '2.5', textAlign: 'right' }}>
            <li>✔️ تفعيل لجهاز واحد</li>
            <li>✔️ توفير أكثر من 30%</li>
            <li>✔️ إدارة حملات غير محدودة</li>
            <li>✔️ دعم فني أولوية عالية</li>
            <li>✔️ تحديثات مجانية</li>
          </ul>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => handleSelect('yearly', 200)}>
            اشترك الآن
          </button>
        </div>

      </div>
    </main>
  );
}
