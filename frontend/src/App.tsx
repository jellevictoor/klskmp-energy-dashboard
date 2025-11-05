import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { Costs } from './pages/Costs'
import { EVCC } from './pages/EVCC'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/evcc" element={<EVCC />} />
      </Routes>
    </Layout>
  )
}

export default App
