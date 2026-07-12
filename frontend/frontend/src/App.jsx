import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { CompanyProvider } from './context/CompanyContext';
import MainLayout from './components/layout/MainLayout';

import Dashboard from './pages/Dashboard';
import PartyManagement from './pages/PartyManagement';
import CustomerManagement from './pages/CustomerManagement';
import ItemMaster from './pages/ItemMaster';
import PurchaseEntry from './pages/Purchase/PurchaseEntry';
import PurchaseHistory from './pages/PurchaseHistory';
import SalesEntry from './pages/SalesEntry';
import BillHistory from './pages/BillHistory';
import Reports from './pages/Reports';
import CompanySettings from './pages/CompanySettings';

export default function App() {
  return (
    <ToastProvider>
      <CompanyProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/parties" element={<PartyManagement />} />
              <Route path="/customers" element={<CustomerManagement />} />
              <Route path="/items" element={<ItemMaster />} />
              <Route path="/purchase-entry" element={<PurchaseEntry />} />
              <Route path="/purchase-history" element={<PurchaseHistory />} />
              <Route path="/sales-entry" element={<SalesEntry />} />
              <Route path="/bill-history" element={<BillHistory />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/company-settings" element={<CompanySettings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CompanyProvider>
    </ToastProvider>
  );
}
