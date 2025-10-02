package main

import (
	"fmt"
	"log"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "Umayor2025**"
	
	// Generar hash con costo 12 (igual al usado en el sistema)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		log.Fatal("Error generando hash:", err)
	}
	
	fmt.Printf("Contraseña: %s\n", password)
	fmt.Printf("Hash: %s\n", string(hash))
	
	// Verificar que el hash es correcto
	err = bcrypt.CompareHashAndPassword(hash, []byte(password))
	if err != nil {
		log.Fatal("Error verificando hash:", err)
	}
	
	fmt.Println("✅ Hash verificado correctamente")
}