package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"

	"shop_pos_backend/config"
	"shop_pos_backend/models"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	_ "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func SeedDatabase() {
	godotenv.Load()

	// Auto-generate asymmetric cryptographic keys for Admin and Cashier roles
	config.GenerateRoleKeys()

	// 1. Create the database if it doesn't exist (only if running locally)
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "localhost" || dbHost == "" {
		dsn := "host=localhost user=postgres password=postgres port=5432 sslmode=disable"
		db, err := sql.Open("pgx", dsn)
		if err == nil {
			_, err = db.Exec("CREATE DATABASE shop_pos")
			if err != nil {
				fmt.Println("Database may already exist (or error):", err.Error())
			} else {
				fmt.Println("Database shop_pos created successfully.")
			}
			db.Close()
		} else {
			fmt.Println("Could not connect to base postgres to create DB:", err)
		}
	} else {
		fmt.Println("Remote host detected. Skipping database creation step...")
	}

	// 2. Connect to shop_pos and migrate
	config.ConnectDB()
	fmt.Println("Migrating database...")
	// Force-drop old tables to refresh relationship constraints and types cleanly
	config.DB.Migrator().DropTable("sales", "sale_items")
	config.DB.AutoMigrate(&models.User{}, &models.Category{}, &models.Product{}, &models.Sale{}, &models.SaleItem{})

	// 3. Seed Data
	seedData(config.DB)
}

type seedFile struct {
	Categories []models.Category `json:"categories"`
	Products   []models.Product  `json:"products"`
}

func seedData(db *gorm.DB) {
	// Seed Admin User
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
		user := models.User{
			Username: "admin",
			Password: string(hash),
			Role:     "admin",
		}
		db.Create(&user)
		fmt.Println("Created default admin user (admin / admin123)")
	}

	// Load catalog demo data (20 categories / 100 products) from JSON reference
	data, err := os.ReadFile("seed_data.json")
	if err != nil {
		fmt.Println("seed_data.json not found, skipping catalog seed:", err)
		return
	}

	var seed seedFile
	if err := json.Unmarshal(data, &seed); err != nil {
		fmt.Println("Failed to parse seed_data.json:", err)
		return
	}

	// Clear existing catalog before reseeding
	db.Exec("TRUNCATE products, categories RESTART IDENTITY CASCADE")
	fmt.Printf("Refreshing %d categories and %d products from seed_data.json...\n", len(seed.Categories), len(seed.Products))

	if len(seed.Categories) > 0 {
		if err := db.Create(&seed.Categories).Error; err != nil {
			fmt.Println("Category seed error:", err)
		}
	}
	if len(seed.Products) > 0 {
		if err := db.Create(&seed.Products).Error; err != nil {
			fmt.Println("Product seed error:", err)
		}
	}
	fmt.Println("Catalog seed complete")
}
