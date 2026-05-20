import { Link, useNavigate } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar({ user }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <header className={styles.navbar}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandName}>ClinicalScribe AI</span>
      </Link>

      <nav className={styles.nav}>
        {user ? (
          <>
            <Link to="/dashboard" className={styles.navLink}>Dashboard</Link>
            <Link to="/patients" className={styles.navLink}>Patients</Link>
            <Link to="/history" className={styles.navLink}>History</Link>
            <Link to="/usage" className={styles.navLink}>Usage</Link>
            <div className={styles.userMenu}>
              <span className={styles.userAvatar}>{user.full_name?.[0] || user.email[0].toUpperCase()}</span>
              <span className={styles.userName}>{user.full_name || user.email}</span>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.navLink}>Sign In</Link>
            <Link to="/register" className={styles.navLinkPrimary}>Get Started</Link>
          </>
        )}
      </nav>
    </header>
  )
}
