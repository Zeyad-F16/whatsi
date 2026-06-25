'use client';
import { useState, useEffect } from 'react';

export default function Admin() {
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      fetchData(savedToken);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        sessionStorage.setItem('adminToken', data.token);
        fetchData(data.token);
      } else {
        alert('كلمة المرور غير صحيحة');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (authToken) => {
    try {
      const statsRes = await fetch('http://localhost:3001/api/admin/stats', {
        headers: { Authorization: authToken }
      });
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);

      const clientsRes = await fetch('http://localhost:3001/api/admin/clients', {
        headers: { Authorization: authToken }
      });
      const clientsData = await clientsRes.json();
      if (clientsData.success) setClients(clientsData.clients);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
      if (error.status === 401) {
        setToken(null);
        sessionStorage.removeItem('adminToken');
      }
    }
  };

  if (!token) {
    return (
      <main className="container" style={{ padding: '100px 20px', maxWidth: '400px' }}>
        <form className="glass" onSubmit={handleLogin} style={{ padding: '40px', textAlign: 'center' }}>
          <h2>تسجيل دخول الإدارة</h2>
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '15px', margin: '20px 0', borderRadius: '8px', border: 'none' }}
          />
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="container animate-fade-in" style={{ padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem' }}>لوحة تحكم Whatsi</h1>
        <button className="glass" onClick={() => { setToken(null); sessionStorage.removeItem('adminToken'); }} style={{ padding: '10px 20px', color: 'white', background: 'transparent', border: '1px solid red' }}>
          تسجيل الخروج
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="glass" style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: '#aaa' }}>إجمالي العملاء</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.totalClients}</div>
          </div>
          <div className="glass" style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: '#aaa' }}>العملاء النشطين</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4ade80' }}>{stats.activeClients}</div>
          </div>
          <div className="glass" style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: '#aaa' }}>إجمالي الأرباح</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>${stats.totalRevenue}</div>
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: '20px', overflowX: 'auto' }}>
        <h2>قائمة العملاء</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '15px' }}>الاسم</th>
              <th style={{ padding: '15px' }}>الباقة</th>
              <th style={{ padding: '15px' }}>كود التفعيل</th>
              <th style={{ padding: '15px' }}>الحالة</th>
              <th style={{ padding: '15px' }}>تاريخ الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '15px' }}>{client.name}</td>
                <td style={{ padding: '15px' }}>{client.planType === 'monthly' ? 'شهرية' : 'سنوية'}</td>
                <td style={{ padding: '15px', fontFamily: 'monospace' }}>{client.activationCode}</td>
                <td style={{ padding: '15px', color: client.isActive ? '#4ade80' : '#f87171' }}>
                  {client.isActive ? 'نشط' : 'معطل'}
                </td>
                <td style={{ padding: '15px' }}>{new Date(client.expiryDate).toLocaleDateString('ar-EG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
