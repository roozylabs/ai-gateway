package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	h, err := bcrypt.GenerateFromPassword([]byte("X4k#1plZI6cEDyUUhwht"), 10)
	if err != nil {
		panic(err)
	}
	fmt.Println("HASH:", string(h))
}
