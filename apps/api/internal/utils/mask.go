package utils

import "strings"

func MaskAPIKey(key string) string {
	if len(key) <= 8 {
		return key[:4] + "••••" + key[len(key)-4:]
	}
	if len(key) <= 12 {
		return key[:4] + "••••" + key[len(key)-4:]
	}
	return key[:8] + "••••" + key[len(key)-4:]
}

func MaskEmailName(name string) string {
	if !strings.Contains(name, "@") {
		return name
	}
	parts := strings.SplitN(name, "@", 2)
	user := parts[0]
	domain := parts[1]
	if len(user) <= 2 {
		return user[:1] + "***@" + domain
	}
	return user[:2] + "***" + user[len(user)-1:] + "@" + domain
}
