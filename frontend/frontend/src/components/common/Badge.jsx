import './Badge.css';

// tone: 'blue' | 'green' | 'red' | 'gray' | 'amber'
export default function Badge({ children, tone = 'blue' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
