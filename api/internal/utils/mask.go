package utils

func MaskAPIKey(key string) string {
	if len(key) <= 8 {
		return key[:4] + "••••" + key[len(key)-4:]
	}
	if len(key) <= 12 {
		return key[:4] + "••••" + key[len(key)-4:]
	}
	return key[:8] + "••••" + key[len(key)-4:]
}
