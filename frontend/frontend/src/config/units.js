// Matches the backend exactly: ItemMaster.unit and PurchaseItem.unit are both
// plain String columns (see item_master_model.py / purchase_model.py) — not an
// integer code table. This list is just a set of common presets to speed up
// data entry; the field accepts any text, so every consumer of UNIT_OPTIONS
// should let the user type a custom value too (see SearchableSelect's
// `allowCustom` prop) rather than restricting them to this list.
export const UNIT_OPTIONS = [
  'Box',
  'Nos',
  'Piece',
  'Sq.Ft',
  'Sq.Mtr',
  'Kg',
  'Gram',
  'Litre',
  'ML',
  'Bag',
  'Packet',
  'Dozen',
  'Meter',
  'Roll',
  'Set',
  'Bundle',
].map((unit) => ({ value: unit, label: unit }));
