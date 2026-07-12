import './Dashboard.css';

const STAT_CARDS = [
  { label: "Today's Sales", value: '₹0.00', tone: 'blue' },
  { label: "Today's Purchases", value: '₹0.00', tone: 'blue' },
  { label: 'Total Receivable', value: '₹0.00', tone: 'green' },
  { label: 'Total Payable', value: '₹0.00', tone: 'red' },
];

export default function Dashboard() {
  return (
    <div className="page">
      <div className="dashboard">
        <div className="dashboard__stats">
          {STAT_CARDS.map((card) => (
            <div key={card.label} className={`stat-card stat-card--${card.tone}`}>
              <span className="stat-card__label">{card.label}</span>
              <span className="stat-card__value">{card.value}</span>
            </div>
          ))}
        </div>

        <div className="dashboard__panels">
          <div className="dashboard__panel">
            <h3 className="dashboard__panel-title">Recent Sales</h3>
            <div className="dashboard__empty">No sales recorded yet. New sales will appear here.</div>
          </div>
          <div className="dashboard__panel">
            <h3 className="dashboard__panel-title">Recent Purchases</h3>
            <div className="dashboard__empty">No purchases recorded yet. New purchases will appear here.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
