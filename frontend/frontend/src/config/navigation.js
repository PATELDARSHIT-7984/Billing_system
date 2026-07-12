import {
  DashboardIcon,
  PartyIcon,
  CustomerIcon,
  ItemIcon,
  PurchaseIcon,
  PurchaseHistoryIcon,
  SalesIcon,
  BillHistoryIcon,
  ReportsIcon,
  SettingsIcon,
} from '../components/layout/icons';

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { path: '/parties', label: 'Accounts', icon: PartyIcon },
  { path: '/customers', label: 'Customer Management', icon: CustomerIcon },
  { path: '/items', label: 'Item Master', icon: ItemIcon },
  { path: '/purchase-entry', label: 'Purchase Entry', icon: PurchaseIcon },
  { path: '/purchase-history', label: 'Purchase History', icon: PurchaseHistoryIcon },
  { path: '/sales-entry', label: 'Sales Entry', icon: SalesIcon },
  { path: '/bill-history', label: 'Bill History', icon: BillHistoryIcon },
  { path: '/reports', label: 'Reports', icon: ReportsIcon },
  { path: '/company-settings', label: 'Company Settings', icon: SettingsIcon },
];
