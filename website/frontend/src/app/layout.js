import './globals.css';

export const metadata = {
  title: 'Whatsi - تطبيق المراسلة الذكي',
  description: 'حمل تطبيق Whatsi وقم بإدارة رسائلك وحملاتك التسويقية بذكاء واحترافية',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <nav className="glass" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px auto', maxWidth: '1200px', width: '95%' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Whatsi
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="/" style={{ fontWeight: '600' }}>الرئيسية</a>
            <a href="/pricing" style={{ fontWeight: '600' }}>الباقات</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
