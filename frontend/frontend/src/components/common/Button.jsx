import './Button.css';

/**
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 * size: 'sm' | 'md'
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </button>
  );
}
