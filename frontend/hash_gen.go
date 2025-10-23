package main; import ("fmt"; "golang.org/x/crypto/bcrypt"); func main() { hash, _ := bcrypt.GenerateFromPassword([]byte("Umayor2025**"), 14); fmt.Print(string(hash)) }
