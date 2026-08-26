# Go Module & Linter Compliance Rule (`go-module-and-linting`)

## Rule Summary
Setiap kali melakukan modifikasi pada kode Go di `apps/api/`, agent wajib mematuhi standar berikut agar tidak terjadi kegagalan CI/CD pada tahap `golangci-lint` maupun modul Go:

1. **Go Module Tidiness (`go mod tidy`)**:
   - Setiap kali menambah, mengubah, atau menghapus impor/dependensi, jalankan `go mod tidy` di folder `apps/api/`.
   - Pastikan file `apps/api/go.mod` dan `apps/api/go.sum` selalu di-commit bersamaan dengan perubahan kode.

2. **Pembersihan Resource & Penanganan Error `Close()` (`errcheck`)**:
   - Semua panggilan `.Close()` yang di-defer (`rows.Close()`, `resp.Body.Close()`, `httpResp.Body.Close()`, `db.Close()`, `rdb.Close()`) **WAJIB** membungkus pemanggilan tersebut secara eksplisit agar mengabaikan error (misal: `defer func() { _ = rows.Close() }()`).
   - Jangan menulis `defer rows.Close()` atau `defer resp.Body.Close()` tanpa penanganan `_ =`, karena linter `errcheck` akan menganggapnya sebagai *unchecked error return value*.

3. **Sinkronisasi Versi Go & CI Action (`golangci-lint-action`)**:
   - Versi `go` directive di `apps/api/go.mod` harus selaras dengan Action `golangci-lint-action` di `.github/workflows/api-ci-cd.yml`.
   - Gunakan versi Action terbaru (misal: `golangci/golangci-lint-action@v9`) agar biner linter selalu dibangun dengan versi Go yang mampu menganalisis modul Go 1.25+.

---

## Pattern Standard

### 1. Database Query Pattern (`rows.Close()`)
```go
rows, err := r.db.QueryContext(ctx, query, args...)
if err != nil {
	return nil, err
}
defer func() { _ = rows.Close() }() // Explicit ignore for errcheck

for rows.Next() {
	// ... scan ...
}
if err := rows.Err(); err != nil {
	return nil, err
}
```

### 2. HTTP Client Response Body Pattern (`resp.Body.Close()`)
```go
resp, err := client.Do(req)
if err != nil {
	return nil, err
}
defer func() { _ = resp.Body.Close() }() // Explicit ignore for errcheck
```

---

## Pre-Commit / Pre-Push Checklist
- [x] Run `go mod tidy` in `apps/api/`
- [x] Verify no naked `defer res.Close()` exists in new/modified code
- [x] Run `go vet ./...` in `apps/api/` before pushing
