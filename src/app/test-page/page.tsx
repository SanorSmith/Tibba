export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏥 Tibbna Hospital - Test Page</h1>
      <p>✅ Next.js server is working!</p>
      <p>📊 Time: {new Date().toLocaleString()}</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>🔗 Quick Links:</h2>
        <ul>
          <li><a href="/login">Login Page</a></li>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/reception/patients">Patient Management</a></li>
        </ul>
      </div>
    </div>
  );
}
