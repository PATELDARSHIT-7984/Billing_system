import './DataTable.css';

/**
 * columns: [{ key, label, width?, align?, render?: (row) => node }]
 * rows: array of data objects (must include a unique `id`)
 * onEdit, onDelete: (row) => void  -- omit to hide that action
 * loading: boolean
 * emptyMessage: string shown when rows is empty
 */
export default function DataTable({
  columns,
  rows,
  onEdit,
  onDelete,
  onRowClick,
  loading = false,
  emptyMessage = 'No records found.',
}) {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align || 'left' }}>
                {col.label}
              </th>
            ))}
            {hasActions && <th className="data-table__actions-col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length + (hasActions ? 1 : 0)} className="data-table__state">
                Loading records...
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (hasActions ? 1 : 0)} className="data-table__state">
                {emptyMessage}
              </td>
            </tr>
          )}

          {!loading && rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'data-table__row--clickable' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {hasActions && (
                <td className="data-table__actions-col" onClick={(e) => e.stopPropagation()}>
                  <div className="data-table__actions">
                    {onEdit && (
                      <button
                        type="button"
                        className="data-table__action-btn data-table__action-btn--edit"
                        onClick={() => onEdit(row)}
                        title="Edit"
                        aria-label={`Edit row`}
                      >
                        ✎
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="data-table__action-btn data-table__action-btn--delete"
                        onClick={() => onDelete(row)}
                        title="Delete"
                        aria-label={`Delete row`}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
