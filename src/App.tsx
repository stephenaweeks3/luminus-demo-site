import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DemoProvider } from './context'
import { Header } from './components/Header'
import { DebugPanel } from './components/DebugPanel'
import { HomePage } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'

function Layout() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gas" element={<ProductPage category="Gas" />} />
        <Route path="/solar" element={<ProductPage category="Solar" />} />
        <Route path="/battery" element={<ProductPage category="Home Battery" />} />
        <Route path="/ev" element={<ProductPage category="EV Charging" />} />
      </Routes>
      <DebugPanel />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <Layout />
      </DemoProvider>
    </BrowserRouter>
  )
}
