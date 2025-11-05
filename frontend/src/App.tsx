import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { Costs } from './pages/Costs'
import { EVCC } from './pages/EVCC'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/evcc" element={<EVCC />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
