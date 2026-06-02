package config

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"log"
	"os"
	"path/filepath"
)

// GenerateRoleKeys checks if RSA public/private keys exist for each role (admin, cashier)
// and generates them in PEM format if they are missing.
func GenerateRoleKeys() {
	keysDir := "keys"
	if err := os.MkdirAll(keysDir, 0755); err != nil {
		log.Println("Error creating keys directory:", err)
		return
	}

	roles := []string{"admin", "cashier"}
	for _, role := range roles {
		privPath := filepath.Join(keysDir, role+"_private.pem")
		pubPath := filepath.Join(keysDir, role+"_public.pem")

		// Check if keys already exist
		if _, err := os.Stat(privPath); err == nil {
			if _, err := os.Stat(pubPath); err == nil {
				// Keys already exist, skip generation
				continue
			}
		}

		log.Printf("[KeyGen] Generating RSA 2048-bit keypair for role: %s...\n", role)
		
		// Generate key pair
		privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			log.Println("[KeyGen] Error generating private key:", err)
			continue
		}

		// Save Private Key PEM block
		privBytes := x509.MarshalPKCS1PrivateKey(privateKey)
		privBlock := &pem.Block{
			Type:  "RSA PRIVATE KEY",
			Bytes: privBytes,
		}
		privFile, err := os.Create(privPath)
		if err != nil {
			log.Println("[KeyGen] Error creating private key file:", err)
			continue
		}
		if err := pem.Encode(privFile, privBlock); err != nil {
			log.Println("[KeyGen] Error writing private key PEM:", err)
		}
		privFile.Close()

		// Save Public Key PEM block
		pubBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
		if err != nil {
			log.Println("[KeyGen] Error marshalling public key:", err)
			continue
		}
		pubBlock := &pem.Block{
			Type:  "PUBLIC KEY",
			Bytes: pubBytes,
		}
		pubFile, err := os.Create(pubPath)
		if err != nil {
			log.Println("[KeyGen] Error creating public key file:", err)
			continue
		}
		if err := pem.Encode(pubFile, pubBlock); err != nil {
			log.Println("[KeyGen] Error writing public key PEM:", err)
		}
		pubFile.Close()

		log.Printf("[KeyGen] Successfully generated keys/%s_private.pem and keys/%s_public.pem\n", role, role)
	}
}
