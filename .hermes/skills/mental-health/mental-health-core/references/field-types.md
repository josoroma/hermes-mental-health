# Assessment Field Types

## scale
- Renders as a radio group with labeled endpoints
- Uses `min` and `max` from the field definition
- Options array provides labels per value
- Example: "Not at all" (0) to "Nearly every day" (3)

## text
- Renders as a `<textarea>`
- No min/max constraints
- Used for free-text responses (CFI, qualitative measures)

## select
- Renders as a `<select>` dropdown
- Options array defines the choices
- Single selection only

## multi_select
- Renders as a checkbox group
- Options array defines the choices
- Multiple selections allowed
- Value is an array of strings

## boolean
- Renders as a Yes/No toggle or radio
- Values: true/false