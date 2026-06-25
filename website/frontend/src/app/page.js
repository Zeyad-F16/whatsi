'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="container animate-fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '20px', lineHeight: '1.2' }}>
        أهلاً بك في <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Whatsi</span>
      </h1>
      <p style={{ fontSize: '1.5rem', color: '#aaa', maxWidth: '800px', margin: '0 auto 50px' }}>
        التطبيق الأول لإدارة رسائلك وحملاتك التسويقية بذكاء. تواصل مع عملائك بسهولة، ونظم أوقاتك، وضاعف مبيعاتك.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '80px' }}>
        <button className="btn-primary" onClick={() => router.push('/pricing')} style={{ padding: '16px 40px', fontSize: '1.2rem' }}>
          اشترك الآن
        </button>
        <button className="glass" style={{ padding: '16px 40px', fontSize: '1.2rem', color: 'white', border: '1px solid var(--primary-color)', cursor: 'pointer', background: 'transparent' }}>
          تعرف على المزيد
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', textAlign: 'right' }}>
        <div className="glass" style={{ padding: '40px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🚀</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>سرعة فائقة</h3>
          <p style={{ color: '#aaa', lineHeight: '1.6' }}>
            قم بإرسال آلاف الرسائل لعملائك في دقائق معدودة وبأعلى معايير الأمان والاستقرار.
          </p>
        </div>
        <div className="glass" style={{ padding: '40px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>📊</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>تقارير دقيقة</h3>
          <p style={{ color: '#aaa', lineHeight: '1.6' }}>
            تابع نتائج حملاتك بشكل لحظي مع تقارير تفصيلية توضح لك مدى نجاح وصول رسائلك.
          </p>
        </div>
        <div className="glass" style={{ padding: '40px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🛡️</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>حماية وخصوصية</h3>
          <p style={{ color: '#aaa', lineHeight: '1.6' }}>
            نظام متطور يحافظ على بياناتك ويحمي أرقامك من الحظر لضمان استمرارية أعمالك.
          </p>
        </div>
      </div>
    </main>
  );
}
