// Pure server component - NO hooks, NO context, NO client imports
export default function NotFound() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#0B192A',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '4rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#04D9FF'
        }}>404</h1>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1rem' 
        }}>Page Not Found</h2>
        <p style={{ 
          color: '#9CA3AF', 
          marginBottom: '2rem' 
        }}>The page you are looking for does not exist.</p>
        <a 
          href="/" 
          style={{ 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#04D9FF',
            color: '#0B192A',
            fontWeight: '600',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          Return Home
        </a>
      </div>
    </div>
  );
}