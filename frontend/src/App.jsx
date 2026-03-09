import { useState, useEffect } from 'react'
import UserRoutes from './routes/UserRoutes'
import LoadingScreen from './components/common/LoadingScreen'

function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Show loading screen for 6 seconds (one full animation cycle)
    const timer = setTimeout(() => {
      setLoading(false)
    }, 6000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <UserRoutes />
  )
}

export default App
