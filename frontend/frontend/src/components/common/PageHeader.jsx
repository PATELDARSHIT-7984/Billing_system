import SearchBar from './SearchBar';
import Button from './Button';
import './PageHeader.css';

export default function PageHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onAddClick,
  addLabel = 'Add New',
  extraActions = null,
}) {
  return (
    <div className="page-header">
      <div className="page-header__titles">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      <div className="page-header__actions">
        {onSearchChange && (
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
          />
        )}
        {extraActions}
        {onAddClick && (
          <Button variant="primary" onClick={onAddClick} icon={<span>+</span>}>
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
