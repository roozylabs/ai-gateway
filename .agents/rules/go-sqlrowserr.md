# Go Database Query Guidelines (`sqlrowserr`)

## Rule Summary
Every time you execute a database query using `rows, err := db.QueryContext(...)` or `db.Query(...)` and iterate over the results using `for rows.Next()`, you MUST check `rows.Err()` immediately after the loop finishes.

## Problem
In Go, `rows.Next()` returns `false` when there are no more rows OR when an error occurs during iteration (such as a database disconnection or network timeout). Without calling `rows.Err()`, database streaming errors will pass silently without being returned to the caller.

## Required Pattern
Always follow this exact structure when querying rows in Go repositories:

```go
rows, err := r.db.QueryContext(ctx, query, args...)
if err != nil {
	return nil, err
}
defer rows.Close()

var results []MyModel
for rows.Next() {
	var item MyModel
	if err := rows.Scan(&item.Field1, &item.Field2); err != nil {
		return nil, err
	}
	results = append(results, item)
}
if err := rows.Err(); err != nil {
	return nil, err
}
return results, nil
```

## Checklist
- [x] Always call `defer rows.Close()` after checking `QueryContext` error.
- [x] Always call `if err := rows.Err(); err != nil` immediately after `for rows.Next()` block.
- [x] Return the error to caller rather than ignoring it or returning partial data.
