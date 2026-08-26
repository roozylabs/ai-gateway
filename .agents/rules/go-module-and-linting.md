# Go Module & Linter Compliance Rule (`go-module-and-linting`)

## Rule Summary
Setiap kali melakukan modifikasi pada kode Go di `apps/api/`, agent **WAJIB** mematuhi aturan berikut agar tidak terjadi kegagalan CI/CD pada tahap `golangci-lint` maupun pengujian unit (*unit tests*):

1. **Pembersihan Resource & Penanganan Error `Close()` (`errcheck`)**:
   - Semua pemanggilan `.Close()` yang di-defer (`rows.Close()`, `resp.Body.Close()`, `httpResp.Body.Close()`, `db.Close()`, `rdb.Close()`) **WAJIB** di-wrap secara eksplisit dengan fungsi anonim agar mengabaikan nilai balik error (`_ =`):
     ```go
     defer func() { _ = resp.Body.Close() }()
     ```
   - **TIDAK BOLEH** menuliskan `defer resp.Body.Close()` atau `defer rows.Close()` tanpa penanganan `_ =`, karena linter `errcheck` akan menandainya sebagai kesalahan (*unchecked error return value*).
   - Aturan ini berlaku untuk **seluruh** berkas Go: *handler* (termasuk OAuth/Auth/Credential), *proxy engine*, *repository*, *database*, *services*, dan *tests*.

2. **Go Module Tidiness (`go mod tidy`)**:
   - Setiap kali menambah, mengubah, atau menghapus impor dependensi, jalankan `go mod tidy` di folder `apps/api/`.
   - Pastikan berkas `apps/api/go.mod` dan `apps/api/go.sum` di-commit secara bersamaan dengan kode.

3. **Sinkronisasi Versi Go & Action CI (`golangci-lint-action`)**:
   - Versi `go` directive pada `apps/api/go.mod` (misal Go 1.25) harus selaras dengan versi Action `golangci-lint-action` di `.github/workflows/api-ci-cd.yml` (menggunakan `@v9` atau lebih baru).

4. **Inisialisasi OpenTelemetry pada Unit Test**:
   - Ketika menguji handler Prometheus/Telemetry (`telemetry_test.go`), panggil `InitOTel(context.Background())` terlebih dahulu agar *MeterProvider* terdaftar secara valid.

---

## Pattern Standards

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

## Pre-Push Verification Checklist
- [x] Run `go mod tidy` in `apps/api/`
- [x] Verify zero naked `defer [a-zA-Z0-9_\.]+\.(Body\.)?Close\(\)` exists via regex search
- [x] Run `go vet ./...` in `apps/api/` and ensure 0 errors
